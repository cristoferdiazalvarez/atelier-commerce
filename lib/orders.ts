import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { db } from './db';
import { totals } from './money';
import { z } from 'zod';
export const addressSchema = z.object({
  name: z.string().min(2).max(100),
  line1: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(15),
  country: z.string().length(2),
});
export const checkoutSchema = z.object({
  key: z.string().uuid(),
  items: z
    .array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(30),
  address: addressSchema,
  coupon: z.string().max(40).default(''),
  mode: z.enum(['demo', 'stripe']),
});
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_test_'))
    throw new Error('Stripe Test no está configurado. Usa el checkout demo.');
  return new Stripe(key);
}
export async function reserveOrder(userId: string, input: z.infer<typeof checkoutSchema>) {
  if (input.mode === 'demo' && process.env.DEMO_CHECKOUT !== 'true')
    throw new Error('El checkout demo está desactivado.');
  if (input.mode === 'stripe') stripeClient();
  return db.$transaction(
    async (tx) => {
      const prior = await tx.order.findUnique({
        where: { idempotencyKey: input.key },
        include: { payment: true },
      });
      if (prior) {
        if (prior.userId !== userId) throw new Error('FORBIDDEN:Pedido no disponible.');
        return prior;
      }
      const settings = await tx.setting.findUniqueOrThrow({ where: { id: 'store' } });
      const quantities = new Map<string, number>();
      for (const item of input.items)
        quantities.set(item.variantId, (quantities.get(item.variantId) || 0) + item.quantity);
      const variants = await tx.variant.findMany({
        where: { id: { in: [...quantities.keys()] } },
        include: { product: true },
      });
      if (variants.length !== quantities.size) throw new Error('Alguna variante ya no existe.');
      let subtotal = 0;
      for (const variant of variants.sort((a, b) => a.id.localeCompare(b.id))) {
        const quantity = quantities.get(variant.id)!;
        if (quantity > 10 || !variant.active || !variant.product.active)
          throw new Error('Producto no disponible.');
        const result = await tx.variant.updateMany({
          where: { id: variant.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (result.count !== 1)
          throw new Error(`Stock insuficiente: ${variant.product.name} (${variant.size}).`);
        await tx.inventoryMovement.create({
          data: { variantId: variant.id, delta: -quantity, reason: `Reservation ${input.key}` },
        });
        subtotal += variant.product.price * quantity;
      }
      const coupon = input.coupon
        ? await tx.coupon.findUnique({ where: { code: input.coupon.toUpperCase() } })
        : null;
      if (
        input.coupon &&
        (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date()))
      )
        throw new Error('Cupón no válido.');
      const amounts = totals(
        subtotal,
        coupon?.percent || 0,
        settings.taxBps,
        settings.shipping,
        settings.freeShippingAt,
      );
      if (input.mode === 'demo') await tx.cartItem.deleteMany({ where: { userId } });
      return tx.order.create({
        data: {
          userId,
          idempotencyKey: input.key,
          status: input.mode === 'demo' ? 'DEMO' : 'PENDING',
          ...amounts,
          address: input.address,
          couponId: coupon?.id,
          expiresAt: new Date(Date.now() + 31 * 60000),
          payment: { create: { status: input.mode === 'demo' ? 'DEMO_UNPAID' : 'UNPAID' } },
          lines: {
            create: variants.map((v) => ({
              variantId: v.id,
              name: v.product.name,
              size: v.size,
              color: v.color,
              price: v.product.price,
              quantity: quantities.get(v.id)!,
            })),
          },
        },
        include: { payment: true },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function checkout(userId: string, input: z.infer<typeof checkoutSchema>) {
  let order;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      order = await reserveOrder(userId, input);
      break;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code) &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
  if (!order) throw new Error('No se pudo crear el pedido.');
  if (order.status === 'CANCELLED')
    throw new Error('El pedido ha caducado. Inicia un nuevo pedido.');
  if (order.status !== 'PENDING') return { orderId: order.id, url: `/account?order=${order.id}` };
  if (order.expiresAt < new Date())
    throw new Error('La reserva ha caducado. Inicia un nuevo pedido.');
  const stripe = stripeClient();
  if (order.payment?.stripeSessionId) {
    const session = await stripe.checkout.sessions.retrieve(order.payment.stripeSessionId);
    return { orderId: order.id, url: session.url };
  }
  const base = process.env.APP_URL || 'http://localhost:3000';
  if (order.expiresAt.getTime() - Date.now() < 1800000)
    throw new Error(
      'La reserva está pendiente de expirar. Inicia un nuevo pedido cuando se libere el inventario.',
    );
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: `ATELIER · Pedido ${order.id}` },
            unit_amount: order.total,
          },
          quantity: 1,
        },
      ],
      success_url: `${base}/account?order=${order.id}`,
      cancel_url: `${base}/cart?cancelled=1`,
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
      payment_method_types: ['card'],
    },
    { idempotencyKey: order.id },
  );
  await db.payment.update({ where: { orderId: order.id }, data: { stripeSessionId: session.id } });
  return { orderId: order.id, url: session.url };
}
export async function cancelOrder(tx: Prisma.TransactionClient, id: string) {
  const claim = await tx.order.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });
  if (!claim.count) return;
  const lines = await tx.orderLine.findMany({ where: { orderId: id } });
  for (const line of lines) {
    await tx.variant.update({
      where: { id: line.variantId },
      data: { stock: { increment: line.quantity } },
    });
    await tx.inventoryMovement.create({
      data: { variantId: line.variantId, delta: line.quantity, reason: `Expired order ${id}` },
    });
  }
  await tx.payment.update({ where: { orderId: id }, data: { status: 'EXPIRED' } });
}
export async function applyEvent(event: Stripe.Event) {
  if (event.livemode) throw new Error('Live payments are forbidden.');
  return db.$transaction(async (tx) => {
    const claimed = await tx.webhookEvent.createMany({
      data: [{ id: event.id, type: event.type }],
      skipDuplicates: true,
    });
    if (!claimed.count) return;
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (
      orderId &&
      [
        'checkout.session.completed',
        'checkout.session.expired',
        'checkout.session.async_payment_succeeded',
      ].includes(event.type)
    ) {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
      });
      if (!order || order.payment?.stripeSessionId !== session.id)
        throw new Error('Payment session mismatch');
      if (event.type === 'checkout.session.expired') await cancelOrder(tx, orderId);
      else if (session.payment_status === 'paid') {
        if (session.amount_total !== order.total || session.currency !== 'eur')
          throw new Error('Payment amount mismatch');
        const updated = await tx.order.updateMany({
          where: { id: orderId, status: 'PENDING' },
          data: { status: 'PAID' },
        });
        if (updated.count)
          await tx.payment.update({ where: { orderId }, data: { status: 'PAID' } });
        else if (order.status === 'CANCELLED')
          throw new Error('Late payment requires manual reconciliation');
      }
    }
  });
}
