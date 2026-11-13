import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { money } from '@/lib/money';
import { ActionForm } from '@/components/forms';
import { SalesChart } from '@/components/sales-chart';
import { Pagination } from '@/components/pagination';
import {
  VariantEditor,
  ImageEditor,
  TaxonomyEditor,
  CouponEditor,
} from '@/components/admin-fields';
import { pageNumber, orderStatus, orderStatuses } from '@/lib/validation';
export const dynamic = 'force-dynamic';
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await currentUser();
  if (!user || user.role === 'CUSTOMER')
    return (
      <section className="empty">
        <h1>
          Espacio <em>privado.</em>
        </h1>
        <p>Se requiere una cuenta STAFF o ADMIN para acceder.</p>
        <Link className="button" href="/account">
          Ir a mi cuenta
        </Link>
      </section>
    );
  const params = await searchParams,
    page = pageNumber(params.page),
    ordersPage = pageNumber(params.ordersPage),
    customersPage = pageNumber(params.customersPage),
    movementsPage = pageNumber(params.movementsPage),
    auditsPage = pageNumber(params.auditsPage),
    couponsPage = pageNumber(params.couponsPage);
  const q = (params.q || '').slice(0, 100),
    contains = { contains: q, mode: 'insensitive' as const };
  const where = q ? { OR: [{ name: contains }, { slug: contains }] } : {};
  const ordersWhere = {
    ...(orderStatus(params.status) ? { status: orderStatus(params.status) } : {}),
    ...(q ? { OR: [{ id: contains }, { user: { email: contains } }] } : {}),
  };
  const customersWhere = {
    role: 'CUSTOMER' as const,
    ...(q ? { OR: [{ name: contains }, { email: contains }] } : {}),
  };
  const movementsWhere = q ? { OR: [{ reason: contains }, { variant: { sku: contains } }] } : {};
  const auditsWhere = q ? { OR: [{ action: contains }, { entityId: contains }] } : {};
  const couponsWhere = q ? { code: contains } : {};
  const [
    products,
    categories,
    collections,
    orders,
    customers,
    coupons,
    settings,
    audits,
    movements,
    productCount,
    orderStats,
    customerCount,
    ordersCount,
    customersCount,
    movementsCount,
    auditsCount,
    couponsCount,
    allProducts,
  ] = await Promise.all([
    db.product.findMany({
      where,
      include: { variants: { orderBy: { sku: 'asc' } }, images: { orderBy: { position: 'asc' } } },
      orderBy: { name: 'asc' },
      take: 10,
      skip: (page - 1) * 10,
    }),
    db.category.findMany({ orderBy: { name: 'asc' } }),
    db.collection.findMany({ orderBy: { name: 'asc' } }),
    db.order.findMany({
      where: ordersWhere,
      include: { user: { select: { email: true } }, payment: true, lines: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      skip: (ordersPage - 1) * 10,
    }),
    db.user.findMany({
      where: customersWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        addresses: true,
        _count: { select: { orders: true } },
      },
      take: 10,
      skip: (customersPage - 1) * 10,
      orderBy: { createdAt: 'desc' },
    }),
    db.coupon.findMany({
      where: couponsWhere,
      take: 10,
      skip: (couponsPage - 1) * 10,
      orderBy: { code: 'asc' },
    }),
    db.setting.findUniqueOrThrow({ where: { id: 'store' } }),
    db.audit.findMany({
      where: auditsWhere,
      take: 10,
      skip: (auditsPage - 1) * 10,
      orderBy: { createdAt: 'desc' },
    }),
    db.inventoryMovement.findMany({
      where: movementsWhere,
      take: 10,
      skip: (movementsPage - 1) * 10,
      include: { variant: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.product.count({ where }),
    db.order.groupBy({ by: ['status'], _count: true, _sum: { total: true } }),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.order.count({ where: ordersWhere }),
    db.user.count({ where: customersWhere }),
    db.inventoryMovement.count({ where: movementsWhere }),
    db.audit.count({ where: auditsWhere }),
    db.coupon.count({ where: couponsWhere }),
    db.product.count(),
  ]);
  const paid = orderStats
      .filter((o) => ['PAID', 'PROCESSING', 'SHIPPED'].includes(o.status))
      .reduce((n, o) => n + (o._sum.total || 0), 0),
    count = orderStats.reduce((n, o) => n + o._count, 0);
  const sales = await db.order.findMany({
    where: { createdAt: { gte: new Date(new Date().getTime() - 7 * 86400000) } },
    select: { createdAt: true, status: true, total: true },
  });
  const chart = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(new Date().getTime() - (6 - i) * 86400000).toISOString().slice(0, 10),
      rows = sales.filter((o) => o.createdAt.toISOString().startsWith(date));
    return {
      date: date.slice(5),
      orders: rows.length,
      sales: rows
        .filter((o) => ['PAID', 'PROCESSING', 'SHIPPED'].includes(o.status))
        .reduce((s, o) => s + o.total / 100, 0),
    };
  });
  const write = process.env.ALLOW_ADMIN_WRITES === 'true',
    manage = write && user.role === 'ADMIN';
  const productFields = (p?: (typeof products)[number]) => (
    <>
      <input type="hidden" name="id" value={p?.id || ''} />
      <div className="form-row">
        <label>
          Nombre
          <input name="name" defaultValue={p?.name} required />
        </label>
        <label>
          Slug
          <input name="slug" defaultValue={p?.slug} required pattern="[a-z0-9-]+" />
        </label>
      </div>
      <label>
        Descripción
        <textarea name="description" defaultValue={p?.description} required minLength={10} />
      </label>
      <div className="form-row">
        <label>
          Material
          <input name="material" defaultValue={p?.material} required />
        </label>
        <label>
          Precio (céntimos)
          <input name="price" type="number" min="100" defaultValue={p?.price} required />
        </label>
      </div>
      <div className="form-row">
        <label>
          Categoría
          <select name="categoryId" defaultValue={p?.categoryId}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Colección
          <select name="collectionId" defaultValue={p?.collectionId}>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>
          Visible
          <select name="active" defaultValue={String(p?.active ?? true)}>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
        <label>
          Destacado
          <select name="featured" defaultValue={String(p?.featured ?? false)}>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
      </div>
    </>
  );
  return (
    <section className="section">
      <p className="eyebrow">ATELIER / BACK OFFICE</p>
      <div className="admin-title">
        <h1>
          Una visión <em>completa.</em>
        </h1>
        <span className="badge">
          {user.role} · {write ? 'EDICIÓN HABILITADA' : 'SOLO LECTURA'}
        </span>
      </div>
      <div className="stats">
        <div className="stat">
          <span>Ventas Stripe TEST</span>
          <strong>{money(paid)}</strong>
        </div>
        <div className="stat">
          <span>Pedidos (incluye demo)</span>
          <strong>{count}</strong>
        </div>
        <div className="stat">
          <span>Clientes</span>
          <strong>{customerCount}</strong>
        </div>
        <div className="stat">
          <span>Productos</span>
          <strong>{allProducts}</strong>
        </div>
      </div>
      <h2>Los últimos siete días.</h2>
      <SalesChart data={chart} />
      <form className="filters">
        <label>
          Buscar en administración
          <input name="q" defaultValue={params.q} placeholder="Nombre, email, SKU o referencia" />
        </label>
        <label>
          Pedidos
          <select name="status" defaultValue={params.status || ''}>
            <option value="">Todos los estados</option>
            {orderStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="button">Filtrar</button>
      </form>
      <nav className="admin-nav" aria-label="Secciones de administración">
        {['productos', 'pedidos', 'clientes', 'cupones', 'inventario', 'auditoria'].map(
          (section) => (
            <a key={section} href={`#${section}`}>
              {section}
            </a>
          ),
        )}
      </nav>
      <h2 id="productos">Archivo de productos.</h2>
      {products.map((p) => (
        <details key={p.id} className="admin-product">
          <summary>
            {p.name} · {money(p.price)} · {p.variants.reduce((n, v) => n + v.stock, 0)} unidades
          </summary>
          {manage && (
            <ActionForm endpoint="admin/product" transform="numeric">
              {productFields(p)}
            </ActionForm>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Talla / Color</th>
                  <th>Stock</th>
                  <th>Movimiento</th>
                </tr>
              </thead>
              <tbody>
                {p.variants.map((v) => (
                  <tr key={v.id}>
                    <td>
                      {v.sku}
                      {!v.active && <span className="badge">Inactiva</span>}
                      {manage && <VariantEditor variant={v} />}
                    </td>
                    <td>
                      {v.size} / {v.color}
                    </td>
                    <td>{v.stock}</td>
                    <td>
                      {write && (
                        <ActionForm
                          endpoint="admin/inventory"
                          transform="numeric"
                          button="Registrar"
                        >
                          <input type="hidden" name="variantId" value={v.id} />
                          <label>
                            Cambio (+/-)
                            <input type="number" name="delta" required min="-1000" max="1000" />
                          </label>
                          <label>
                            Motivo
                            <input name="reason" required minLength={3} />
                          </label>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {manage && (
            <>
              {p.images.map((image) => (
                <ImageEditor key={image.id} image={image} />
              ))}
              <details>
                <summary>Añadir variante</summary>
                <ActionForm endpoint="admin/variant">
                  <input type="hidden" name="productId" value={p.id} />
                  <label>
                    SKU
                    <input name="sku" required />
                  </label>
                  <label>
                    Talla
                    <input name="size" required />
                  </label>
                  <label>
                    Color
                    <input name="color" required />
                  </label>
                </ActionForm>
              </details>
              <details>
                <summary>Añadir imagen</summary>
                <ActionForm endpoint="admin/image" transform="numeric">
                  <input type="hidden" name="productId" value={p.id} />
                  <label>
                    URL HTTPS
                    <input name="url" type="url" required />
                  </label>
                  <label>
                    Texto alternativo
                    <input name="alt" required />
                  </label>
                  <label>
                    Posición
                    <input name="position" type="number" defaultValue="1" min="0" />
                  </label>
                </ActionForm>
              </details>
              <ActionForm endpoint="admin/archive" button="Archivar producto">
                <input type="hidden" name="id" value={p.id} />
              </ActionForm>
            </>
          )}
        </details>
      ))}
      {!products.length && <p>No hay productos con esta búsqueda.</p>}
      <Pagination
        path="/admin"
        params={params}
        parameter="page"
        page={page}
        count={productCount}
        anchor="productos"
      />
      <h2 id="pedidos">Pedidos.</h2>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.id.slice(-8)}
                  <small>{o.createdAt.toISOString().slice(0, 10)}</small>
                  <details>
                    <summary>Ver detalle del pedido</summary>
                    {o.lines.map((line) => (
                      <p key={line.id}>
                        {line.quantity} × {line.name} · {line.size} / {line.color} ·{' '}
                        {money(line.price)}
                      </p>
                    ))}
                    <p>
                      Subtotal {money(o.subtotal)} · Descuento {money(o.discount)} · Impuestos{' '}
                      {money(o.tax)} · Envío {money(o.shipping)}
                    </p>
                  </details>
                </td>
                <td>{o.user.email}</td>
                <td>{money(o.total)}</td>
                <td>
                  {o.status}
                  <small>{o.payment?.status}</small>
                </td>
                <td>
                  {write && ['PAID', 'PROCESSING'].includes(o.status) && (
                    <ActionForm endpoint="admin/order" button="Actualizar">
                      <input type="hidden" name="id" value={o.id} />
                      <label>
                        Nuevo estado
                        <select name="status">
                          {o.status === 'PENDING' ? (
                            <option>CANCELLED</option>
                          ) : o.status === 'PAID' ? (
                            <option>PROCESSING</option>
                          ) : (
                            <option>SHIPPED</option>
                          )}
                        </select>
                      </label>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        path="/admin"
        params={params}
        parameter="ordersPage"
        page={ordersPage}
        count={ordersCount}
        anchor="pedidos"
      />
      <h2 id="clientes">Clientes.</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email ficticio</th>
              <th>Rol</th>
              <th>Pedidos</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.name}
                  <small>Desde {c.createdAt.toISOString().slice(0, 10)}</small>
                  <details>
                    <summary>Direcciones ({c.addresses.length})</summary>
                    {c.addresses.map((a) => (
                      <p key={a.id}>
                        {a.line1} · {a.postalCode} {a.city} · {a.country}
                      </p>
                    ))}
                  </details>
                </td>
                <td>{c.email}</td>
                <td>{c.role}</td>
                <td>{c._count.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        path="/admin"
        params={params}
        parameter="customersPage"
        page={customersPage}
        count={customersCount}
        anchor="clientes"
      />
      <h2 id="cupones">Cupones.</h2>
      {coupons.map((c) => (
        <details key={c.id}>
          <summary>
            {c.code} · {c.percent}% · {c.active ? 'Activo' : 'Inactivo'}
          </summary>
          {manage ? (
            <CouponEditor coupon={c} />
          ) : (
            <p>{c.expiresAt?.toISOString() || 'Sin caducidad'}</p>
          )}
        </details>
      ))}
      <Pagination
        path="/admin"
        params={params}
        parameter="couponsPage"
        page={couponsPage}
        count={couponsCount}
        anchor="cupones"
      />
      {manage && (
        <div className="admin-grid">
          <details>
            <summary>Crear producto</summary>
            <ActionForm endpoint="admin/product" transform="numeric">
              {productFields()}
            </ActionForm>
          </details>
          <details>
            <summary>Categorías y colecciones</summary>
            <TaxonomyEditor type="category" rows={categories} />
            <TaxonomyEditor type="collection" rows={collections} />
          </details>
          <details>
            <summary>Crear cupón</summary>
            <CouponEditor />
          </details>
          <details>
            <summary>Configuración de tienda</summary>
            <ActionForm endpoint="admin/settings" transform="numeric">
              <label>
                Impuestos (basis points)
                <input
                  name="taxBps"
                  type="number"
                  defaultValue={settings.taxBps}
                  min="0"
                  max="3000"
                />
              </label>
              <label>
                Envío (céntimos)
                <input name="shipping" type="number" defaultValue={settings.shipping} min="0" />
              </label>
              <label>
                Envío gratis desde (céntimos)
                <input
                  name="freeShippingAt"
                  type="number"
                  defaultValue={settings.freeShippingAt}
                  min="0"
                />
              </label>
            </ActionForm>
          </details>
        </div>
      )}
      <h2 id="inventario">Movimientos de inventario.</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Cambio</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{m.variant.sku}</td>
                <td>{m.delta}</td>
                <td>{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        path="/admin"
        params={params}
        parameter="movementsPage"
        page={movementsPage}
        count={movementsCount}
        anchor="inventario"
      />
      <h2 id="auditoria">Auditoría.</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Actor</th>
              <th>Acción</th>
              <th>Entidad</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id}>
                <td>{a.createdAt.toISOString()}</td>
                <td>{a.actorId}</td>
                <td>{a.action}</td>
                <td>{a.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        path="/admin"
        params={params}
        parameter="auditsPage"
        page={auditsPage}
        count={auditsCount}
        anchor="auditoria"
      />
    </section>
  );
}
