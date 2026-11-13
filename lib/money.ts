export const money = (cents: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
export function totals(
  subtotal: number,
  percent: number,
  taxBps: number,
  shippingCost: number,
  freeAt: number,
) {
  const discount = Math.round((subtotal * percent) / 100);
  const tax = Math.round(((subtotal - discount) * taxBps) / 10000);
  const shipping = subtotal >= freeAt ? 0 : shippingCost;
  return { subtotal, discount, tax, shipping, total: subtotal - discount + tax + shipping };
}
