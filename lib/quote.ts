import { z } from 'zod';
import { db } from './db';
import { cartItemsSchema } from './validation';
import { totals } from './money';
export const quoteSchema = z.object({
  items: cartItemsSchema.refine((items) => items.length > 0),
  coupon: z.string().max(40).default(''),
});
export async function quoteOrder(input: z.infer<typeof quoteSchema>) {
  const [variants, settings, coupon] = await Promise.all([
    db.variant.findMany({
      where: {
        id: { in: input.items.map((i) => i.variantId) },
        active: true,
        product: { active: true },
      },
      include: { product: true },
    }),
    db.setting.findUniqueOrThrow({ where: { id: 'store' } }),
    input.coupon ? db.coupon.findUnique({ where: { code: input.coupon.toUpperCase() } }) : null,
  ]);
  if (
    input.coupon &&
    (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date()))
  )
    throw new Error('Cupón no válido.');
  if (variants.length !== input.items.length)
    throw new Error('Alguna pieza ya no está disponible.');
  let subtotal = 0;
  for (const item of input.items) {
    const variant = variants.find((v) => v.id === item.variantId)!;
    if (variant.stock < item.quantity)
      throw new Error(`Stock insuficiente: ${variant.product.name}.`);
    subtotal += variant.product.price * item.quantity;
  }
  return totals(
    subtotal,
    coupon?.percent || 0,
    settings.taxBps,
    settings.shipping,
    settings.freeShippingAt,
  );
}
