import { z } from 'zod';
export const idSchema = z.string().min(1).max(100);
export const passwordSchema = z
  .string()
  .min(10)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must not exceed 72 UTF-8 bytes.',
  );
export const cartItemsSchema = z
  .array(z.object({ variantId: idSchema, quantity: z.number().int().min(1).max(10) }))
  .max(30)
  .refine(
    (items) => new Set(items.map((i) => i.variantId)).size === items.length,
    'Duplicate variants are not allowed.',
  );
export const syncSchema = z.object({
  items: cartItemsSchema,
  favorites: z.array(idSchema).max(100),
});
export function pageNumber(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, 10000) : 1;
}
export const orderStatuses = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'CANCELLED',
  'DEMO',
] as const;
export function orderStatus(value: string | undefined) {
  return orderStatuses.find((s) => s === value);
}
