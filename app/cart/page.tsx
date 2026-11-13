import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { Cart } from '@/components/cart';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const [settings, user] = await Promise.all([
    db.setting.findUniqueOrThrow({ where: { id: 'store' } }),
    currentUser(),
  ]);
  const addresses = user ? await db.address.findMany({ where: { userId: user.id } }) : [];
  return (
    <section className="section">
      <Cart
        addresses={addresses}
        settings={settings}
        signedIn={!!user}
        stripeReady={!!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')}
        demo={process.env.DEMO_CHECKOUT === 'true'}
      />
    </section>
  );
}
