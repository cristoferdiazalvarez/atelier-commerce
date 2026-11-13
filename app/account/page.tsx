import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';
import { productInclude } from '@/lib/catalog';
import { AuthForm, ActionForm } from '@/components/forms';
import { Favorites } from '@/components/favorites';
import { AddressFields } from '@/components/address-fields';
import { pageNumber } from '@/lib/validation';
import { Pagination } from '@/components/pagination';
export const dynamic = 'force-dynamic';
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; order?: string; tab?: string; page?: string }>;
}) {
  const params = await searchParams,
    user = await currentUser();
  if (params.tab === 'favorites') {
    const products = await db.product.findMany({
      where: { active: true },
      include: productInclude,
    });
    return (
      <section className="section">
        <h1>
          Tus <em>favoritos.</em>
        </h1>
        <Favorites products={products} />
      </section>
    );
  }
  if (!user || params.reset)
    return (
      <section className="section auth-section">
        <AuthForm reset={params.reset} demoLogin={process.env.DEMO_LOGIN === 'true'} />
      </section>
    );
  const page = pageNumber(params.page);
  const [orders, addresses, orderCount] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      include: { lines: true, payment: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      skip: (page - 1) * 10,
    }),
    db.address.findMany({ where: { userId: user.id } }),
    db.order.count({ where: { userId: user.id } }),
  ]);
  return (
    <section className="section">
      <p className="eyebrow">MI ATELIER</p>
      <div className="section-heading">
        <h1>
          Hola, <em>{user.name}.</em>
        </h1>
        <div className="inline-actions">
          {user.role !== 'CUSTOMER' && (
            <Link href="/admin" className="text-link">
              Administración →
            </Link>
          )}
          <ActionForm endpoint="auth/logout" button="Cerrar sesión">
            <input type="hidden" name="logout" value="true" />
          </ActionForm>
        </div>
      </div>
      {orders.some((o) => o.id === params.order) && (
        <p className="notice">
          Pedido recibido. El estado que aparece a continuación confirma si es demo, pendiente o
          pagado en TEST.
        </p>
      )}
      <div className="account-layout">
        <div>
          <h2>Tu archivo de pedidos.</h2>
          {!orders.length && (
            <p>
              Todavía no hay pedidos. <Link href="/catalog">Descubre la colección.</Link>
            </p>
          )}
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div>
                <strong>#{o.id.slice(-8).toUpperCase()}</strong>
                <span className="badge">{o.status}</span>
              </div>
              <p>
                {o.createdAt.toLocaleDateString('es-ES')} · {money(o.total)} · {o.payment?.status}
              </p>
              {o.status === 'DEMO' && <p className="demo-note">Simulación sin pago ni envío.</p>}
              {o.lines.map((l) => (
                <p key={l.id}>
                  {l.quantity} × {l.name} · {l.size} / {l.color}
                </p>
              ))}
              <details>
                <summary>Desglose</summary>
                <p>
                  Subtotal {money(o.subtotal)} · Descuento {money(o.discount)} · Impuestos{' '}
                  {money(o.tax)} · Envío {money(o.shipping)}
                </p>
              </details>
            </article>
          ))}
          <Pagination
            path="/account"
            params={{}}
            parameter="page"
            page={page}
            count={orderCount}
            size={10}
          />
        </div>
        <aside>
          <h2>Perfil.</h2>
          <ActionForm endpoint="profile">
            <label>
              Nombre
              <input name="name" defaultValue={user.name} required minLength={2} />
            </label>
          </ActionForm>
          <h2>Direcciones.</h2>
          {addresses.map((a) => (
            <div className="address" key={a.id}>
              <p>
                {a.name}
                <br />
                {a.line1}
                <br />
                {a.postalCode} {a.city}, {a.country}
              </p>
              <details>
                <summary>Editar dirección</summary>
                <ActionForm endpoint="addresses">
                  <AddressFields address={a} />
                </ActionForm>
              </details>
              <ActionForm endpoint="addresses/delete" button="Eliminar dirección">
                <input type="hidden" name="id" value={a.id} />
              </ActionForm>
            </div>
          ))}
          <details>
            <summary>Añadir dirección</summary>
            <ActionForm endpoint="addresses">
              <AddressFields />
            </ActionForm>
          </details>
        </aside>
      </div>
    </section>
  );
}
