import Link from 'next/link';
import { catalog } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'La colección' };
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { products, count, categories, collections, page } = await catalog(params);
  const pageUrl = (n: number) =>
    `/catalog?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<string, string>), page: String(n) })}`;
  return (
    <section className="section catalog">
      <p className="eyebrow">THE CONSIDERED WARDROBE</p>
      <div className="section-heading">
        <h1>
          La <em>colección.</em>
        </h1>
        <span>{count} piezas, infinitas posibilidades.</span>
      </div>
      <form className="filters" action="/catalog">
        <label>
          Buscar
          <input name="q" defaultValue={params.q} placeholder="Encuentra tu pieza" />
        </label>
        <label>
          Categoría
          <select name="category" defaultValue={params.category || ''}>
            <option value="">Todas las piezas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Colección
          <select name="collection" defaultValue={params.collection || ''}>
            <option value="">Todas</option>
            {collections.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Talla
          <select name="size" defaultValue={params.size || ''}>
            <option value="">Todas</option>
            {['XS', 'S', 'M', 'L', 'Única'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Color
          <select name="color" defaultValue={params.color || ''}>
            <option value="">Todos</option>
            <option>Arena</option>
            <option>Negro</option>
          </select>
        </label>
        <label>
          Precio máximo (€)
          <input
            name="max"
            type="number"
            min="0"
            defaultValue={params.max}
            placeholder="Sin límite"
          />
        </label>
        <label>
          Ordenar
          <select name="sort" defaultValue={params.sort || ''}>
            <option value="">Novedades</option>
            <option value="price-asc">Precio menor</option>
            <option value="price-desc">Precio mayor</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            name="available"
            value="true"
            defaultChecked={params.available === 'true'}
          />{' '}
          Disponible
        </label>
        <button className="button" type="submit">
          Aplicar filtros
        </button>
        <Link className="text-link" href="/catalog">
          Limpiar
        </Link>
      </form>
      {products.length ? (
        <div className="product-grid catalog-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>Un espacio para descubrir.</h2>
          <p>No hay piezas con estos filtros.</p>
          <Link href="/catalog" className="text-link">
            Ver toda la colección
          </Link>
        </div>
      )}
      <nav className="pagination" aria-label="Paginación">
        {page > 1 && <Link href={pageUrl(page - 1)}>← Anterior</Link>}
        <span>
          Página {page} de {Math.max(1, Math.ceil(count / 9))}
        </span>
        {page * 9 < count && <Link href={pageUrl(page + 1)}>Siguiente →</Link>}
      </nav>
    </section>
  );
}
