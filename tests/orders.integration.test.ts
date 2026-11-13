import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { quoteOrder } from '../lib/quote';
import { mutateAdmin } from '../lib/admin';
import { reserveOrder, checkout, applyEvent, cancelOrder } from '../lib/orders';
const db = new PrismaClient();
const tag = `test-${crypto.randomUUID()}`;
let userId: string, variantId: string, productId: string, categoryId: string, collectionId: string;
function input(mode: 'demo' | 'stripe' = 'demo') {
  return {
    key: crypto.randomUUID(),
    items: [{ variantId, quantity: 1 }],
    address: {
      name: 'Test Customer',
      line1: 'Test Street 10',
      city: 'Test City',
      postalCode: '12345',
      country: 'ES',
    },
    coupon: '',
    mode,
  };
}
describe('real PostgreSQL order invariants', () => {
  beforeAll(async () => {
    process.env.DEMO_CHECKOUT = 'true';
    const user = await db.user.create({
      data: { email: `${tag}@example.test`, name: 'Test Customer', passwordHash: 'test-only' },
    });
    userId = user.id;
    const category = await db.category.create({ data: { name: tag, slug: tag } });
    categoryId = category.id;
    const collection = await db.collection.create({ data: { name: tag, slug: tag } });
    collectionId = collection.id;
    const product = await db.product.create({
      data: {
        slug: tag,
        name: 'Integration Test',
        description: 'Test fixture',
        material: 'Cotton',
        price: 10000,
        categoryId,
        collectionId,
        variants: { create: { sku: tag, size: 'S', color: 'Test', stock: 1 } },
      },
      include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0].id;
    await db.setting.upsert({ where: { id: 'store' }, create: { id: 'store' }, update: {} });
  });
  afterAll(async () => {
    const orders = await db.order.findMany({ where: { userId } });
    const ids = orders.map((o) => o.id);
    await db.payment.deleteMany({ where: { orderId: { in: ids } } });
    await db.orderLine.deleteMany({ where: { orderId: { in: ids } } });
    await db.order.deleteMany({ where: { userId } });
    await db.inventoryMovement.deleteMany({ where: { variantId } });
    await db.variant.deleteMany({ where: { productId } });
    await db.product.delete({ where: { id: productId } });
    await db.category.delete({ where: { id: categoryId } });
    await db.collection.delete({ where: { id: collectionId } });
    await db.user.delete({ where: { id: userId } });
    await db.webhookEvent.deleteMany({ where: { id: { startsWith: tag } } });
    await db.$disconnect();
  });
  it('allows only one of two concurrent purchases of the final unit', async () => {
    const results = await Promise.allSettled([
      checkout(userId, input()),
      checkout(userId, input()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(0);
  });
  it('returns one order for repeated keys and prevents cross-account access', async () => {
    await db.variant.update({ where: { id: variantId }, data: { stock: 3 } });
    const data = input();
    const first = await reserveOrder(userId, data),
      second = await reserveOrder(userId, data);
    expect(second.id).toBe(first.id);
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(2);
    await expect(reserveOrder('other-user', data)).rejects.toThrow('FORBIDDEN');
  });
  it('rolls back stock changes if a coupon is invalid', async () => {
    const before = await db.variant.findUniqueOrThrow({ where: { id: variantId } });
    await expect(reserveOrder(userId, { ...input(), coupon: 'NO-SUCH-COUPON' })).rejects.toThrow(
      'Cupón',
    );
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(
      before.stock,
    );
  });
  it('processes paid events once and verifies the amount', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
    const order = await reserveOrder(userId, input('stripe'));
    const sessionId = `cs_test_${order.id}`;
    await db.payment.update({ where: { orderId: order.id }, data: { stripeSessionId: sessionId } });
    const event = {
      id: `${tag}-paid`,
      type: 'checkout.session.completed',
      livemode: false,
      data: {
        object: {
          id: sessionId,
          metadata: { orderId: order.id },
          payment_status: 'paid',
          amount_total: order.total,
          currency: 'eur',
        },
      },
    } as unknown as Stripe.Event;
    await applyEvent(event);
    await applyEvent(event);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PAID');
    expect(await db.webhookEvent.count({ where: { id: event.id } })).toBe(1);
    await expect(
      applyEvent({
        ...event,
        id: `${tag}-invalid`,
        data: { object: { ...event.data.object, amount_total: 1 } },
      } as Stripe.Event),
    ).rejects.toThrow('amount');
  });
  it('releases a pending reservation only once', async () => {
    const order = await reserveOrder(userId, input('stripe'));
    const before = (await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock;
    await db.$transaction((tx) => cancelOrder(tx, order.id));
    await db.$transaction((tx) => cancelOrder(tx, order.id));
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(
      before + 1,
    );
  });
  it('deduplicates simultaneous signed events atomically', async () => {
    await db.variant.update({ where: { id: variantId }, data: { stock: 3 } });
    const order = await reserveOrder(userId, input('stripe'));
    const sessionId = `cs_test_${order.id}`;
    await db.payment.update({ where: { orderId: order.id }, data: { stripeSessionId: sessionId } });
    const event = {
      id: `${tag}-parallel`,
      type: 'checkout.session.completed',
      livemode: false,
      data: {
        object: {
          id: sessionId,
          metadata: { orderId: order.id },
          payment_status: 'paid',
          amount_total: order.total,
          currency: 'eur',
        },
      },
    } as unknown as Stripe.Event;
    await Promise.all([applyEvent(event), applyEvent(event)]);
    expect(await db.webhookEvent.count({ where: { id: event.id } })).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PAID');
  });
  it('rejects inactive variants and quotes current server prices', async () => {
    await db.variant.update({ where: { id: variantId }, data: { active: false, stock: 3 } });
    await expect(reserveOrder(userId, input())).rejects.toThrow('disponible');
    await db.variant.update({ where: { id: variantId }, data: { active: true } });
    const quote = await quoteOrder({ items: [{ variantId, quantity: 1 }], coupon: '' });
    expect(quote.subtotal).toBe(10000);
    await expect(
      quoteOrder({ items: [{ variantId, quantity: 1 }], coupon: 'INVALID' }),
    ).rejects.toThrow('Cupón');
  });
  it('commits administration audit and inventory together', async () => {
    process.env.ALLOW_ADMIN_WRITES = 'true';
    const before = (await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock;
    await mutateAdmin({ id: userId, role: 'ADMIN' }, 'admin/inventory', {
      variantId,
      delta: 2,
      reason: 'Integration admin verification',
    });
    expect((await db.variant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(
      before + 2,
    );
    expect(await db.audit.count({ where: { actorId: userId, entityId: variantId } })).toBe(1);
    await expect(
      mutateAdmin({ id: userId, role: 'CUSTOMER' }, 'admin/inventory', {
        variantId,
        delta: 1,
        reason: 'Denied',
      }),
    ).rejects.toThrow('FORBIDDEN');
    await db.audit.deleteMany({ where: { actorId: userId } });
  });
  it('verifies Stripe signatures and rejects tampering', () => {
    const stripe = new Stripe('sk_test_fixture'),
      payload = JSON.stringify({
        id: `${tag}-signed`,
        type: 'test',
        livemode: false,
        data: { object: {} },
      }),
      secret = 'whsec_test_fixture';
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe(`${tag}-signed`);
    expect(() => stripe.webhooks.constructEvent(payload + ' ', header, secret)).toThrow();
  });
});
