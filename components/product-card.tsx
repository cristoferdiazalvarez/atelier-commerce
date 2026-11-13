'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { Heart, ArrowUpRight } from 'lucide-react';
import type { CatalogProduct } from '@/lib/catalog';
import { money } from '@/lib/money';
import { useBag } from './store';
export function ProductCard({ product: p }: { product: CatalogProduct }) {
  const selected = useBag((s) => s.favorites.includes(p.id));
  const favorite = useBag((s) => s.favorite);
  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={`/product/${p.slug}`}>
          <img src={p.images[0]?.url} alt={p.images[0]?.alt || p.name} loading="lazy" />
        </Link>
        <span className="product-tag">{p.category.name}</span>
        <button
          className={`favorite ${selected ? 'selected' : ''}`}
          aria-label={`${selected ? 'Quitar de' : 'Añadir a'} favoritos: ${p.name}`}
          aria-pressed={selected}
          onClick={() => {
            favorite(p.id);
          }}
        >
          <Heart size={18} fill={selected ? 'currentColor' : 'none'} />
        </button>
        <Link className="quick-view" href={`/product/${p.slug}`}>
          Descubrir la pieza <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="product-caption">
        <div>
          <Link href={`/product/${p.slug}`}>{p.name}</Link>
          <p>{p.material}</p>
        </div>
        <span>{money(p.price)}</span>
      </div>
      <div className="swatches">
        {[...new Set(p.variants.map((v) => v.color))].map((color) => (
          <i key={color} className={color === 'Negro' ? 'black' : 'sand'} title={color} />
        ))}
        <span>{new Set(p.variants.map((v) => v.color)).size} colores</span>
      </div>
    </article>
  );
}
