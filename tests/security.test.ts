import { describe, it, expect, afterEach } from 'vitest';
import { authorizeAdmin } from '../lib/admin';
import { pageNumber, orderStatus, passwordSchema, cartItemsSchema } from '../lib/validation';
const previous = process.env.ALLOW_ADMIN_WRITES;
afterEach(() => {
  process.env.ALLOW_ADMIN_WRITES = previous;
});
describe('authorization and input boundaries', () => {
  it('denies customer writes and restricts staff to inventory and fulfillment', () => {
    process.env.ALLOW_ADMIN_WRITES = 'true';
    expect(() => authorizeAdmin('CUSTOMER', 'admin/product')).toThrow('FORBIDDEN');
    expect(() => authorizeAdmin('STAFF', 'admin/product')).toThrow('ADMIN');
    expect(() => authorizeAdmin('STAFF', 'admin/inventory')).not.toThrow();
    expect(() => authorizeAdmin('ADMIN', 'admin/settings')).not.toThrow();
  });
  it('blocks public administrative writes even for an administrator', () => {
    process.env.ALLOW_ADMIN_WRITES = 'false';
    expect(() => authorizeAdmin('ADMIN', 'admin/product')).toThrow('solo lectura');
  });
  it('rejects duplicate cart variants and bcrypt truncation', () => {
    expect(
      cartItemsSchema.safeParse([
        { variantId: 'a', quantity: 1 },
        { variantId: 'a', quantity: 1 },
      ]).success,
    ).toBe(false);
    expect(passwordSchema.safeParse('é'.repeat(40)).success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(72)).success).toBe(true);
  });
  it('bounds malformed pagination and ignores invalid order states', () => {
    for (const value of ['Infinity', '1.5', '-1', 'abc']) expect(pageNumber(value)).toBe(1);
    expect(pageNumber('10000000')).toBe(10000);
    expect(orderStatus('untrusted')).toBeUndefined();
  });
});
