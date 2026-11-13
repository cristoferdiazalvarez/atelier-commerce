import { describe, it, expect } from 'vitest';
import { totals } from '../lib/money';
import { checkoutSchema, stripeClient } from '../lib/orders';
describe('server checkout contracts', () => {
  it('rounds discounts and VAT in cents, with threshold shipping', () => {
    expect(totals(19999, 10, 2100, 900, 25000)).toEqual({
      subtotal: 19999,
      discount: 2000,
      tax: 3780,
      shipping: 900,
      total: 22679,
    });
    expect(totals(25000, 0, 2100, 900, 25000).shipping).toBe(0);
  });
  it('rejects negative quantities and missing addresses', () => {
    expect(
      checkoutSchema.safeParse({
        key: crypto.randomUUID(),
        items: [{ variantId: 'x', quantity: -1 }],
        address: {},
        mode: 'demo',
      }).success,
    ).toBe(false);
  });
  it('refuses live Stripe credentials', () => {
    const previous = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_live_forbidden';
    expect(() => stripeClient()).toThrow('Stripe Test');
    process.env.STRIPE_SECRET_KEY = previous;
  });
});
