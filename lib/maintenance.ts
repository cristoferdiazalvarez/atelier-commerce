import type Stripe from 'stripe';
import { db } from './db';
import { stripeClient, applyEvent, cancelOrder } from './orders';
export async function reconcileOrders() {
  const orders = await db.order.findMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    include: { payment: true },
    take: 100,
    orderBy: { expiresAt: 'asc' },
  });
  const result = { examined: orders.length, released: 0, paid: 0, deferred: 0 };
  for (const order of orders) {
    try {
      if (order.payment?.stripeSessionId) {
        const stripe = stripeClient();
        const session = await stripe.checkout.sessions.retrieve(order.payment.stripeSessionId);
        if (session.livemode) throw new Error('Live sessions forbidden');
        if (session.payment_status === 'paid') {
          await applyEvent({
            object: 'event',
            api_version: null,
            created: Math.floor(Date.now() / 1000),
            pending_webhooks: 0,
            request: null,
            id: `reconcile_${session.id}`,
            type: 'checkout.session.completed',
            livemode: false,
            data: { object: session },
          } as Stripe.Event);
          result.paid++;
          continue;
        }
        if (session.status === 'complete') {
          result.deferred++;
          continue;
        }
        if (session.status === 'open') await stripe.checkout.sessions.expire(session.id);
      }
      await db.$transaction((tx) => cancelOrder(tx, order.id));
      result.released++;
    } catch {
      result.deferred++;
    }
  }
  return result;
}
export async function maintenance() {
  const reconciliation = await reconcileOrders();
  const now = new Date();
  const [sessions, resets, counters] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);
  return {
    reconciliation,
    removed: { sessions: sessions.count, resets: resets.count, rateCounters: counters.count },
  };
}
