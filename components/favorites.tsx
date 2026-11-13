'use client';
import type { CatalogProduct } from '@/lib/catalog';
import { useBag } from './store';
import { ProductCard } from './product-card';
export function Favorites({ products }: { products: CatalogProduct[] }) {
  const ids = useBag((s) => s.favorites);
  return (
    <div className="product-grid catalog-grid">
      {products
        .filter((p) => ids.includes(p.id))
        .map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      {!products.some((p) => ids.includes(p.id)) && (
        <p>Aún no has seleccionado favoritos en este dispositivo.</p>
      )}
    </div>
  );
}
