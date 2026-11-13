'use client';
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { CatalogProduct } from '@/lib/catalog';
import { money } from '@/lib/money';
import { useBag } from './store';
export function ProductDetail({ product: p }: { product: CatalogProduct }) {
  const [color, setColor] = useState(p.variants[0]?.color || '');
  const [size, setSize] = useState('');
  const [added, setAdded] = useState(false);
  const [image, setImage] = useState(0);
  const add = useBag((s) => s.add);
  const variant = p.variants.find((v) => v.color === color && v.size === size);
  return (
    <div className="detail">
      <div className="detail-gallery">
        <img
          className="detail-main"
          src={p.images[image]?.url}
          alt={p.images[image]?.alt || p.name}
        />
        {p.images.length > 1 && (
          <div className="thumbnails">
            {p.images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setImage(i)}
                aria-label={`Imagen ${i + 1}`}
                aria-pressed={i === image}
              >
                <img src={img.url} alt={img.alt} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="detail-copy">
        <p className="eyebrow">{p.collection.name}</p>
        <h1>{p.name}</h1>
        <p className="detail-price">
          {money(p.price)} <small>+ impuestos y envío en checkout</small>
        </p>
        <p>{p.description}</p>
        <fieldset>
          <legend>Color · {color}</legend>
          <div className="choices">
            {[...new Set(p.variants.map((v) => v.color))].map((c) => (
              <button
                className={c === color ? 'active' : ''}
                key={c}
                aria-pressed={c === color}
                onClick={() => {
                  setColor(c);
                  setAdded(false);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Talla {size && `· ${size}`}</legend>
          <div className="choices">
            {[...new Set(p.variants.map((v) => v.size))].map((s) => (
              <button
                key={s}
                className={s === size ? 'active' : ''}
                disabled={!p.variants.some((v) => v.color === color && v.size === s && v.stock > 0)}
                aria-pressed={s === size}
                onClick={() => {
                  setSize(s);
                  setAdded(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="stock">
          {variant
            ? variant.stock > 0
              ? `${variant.stock} unidades disponibles`
              : 'Agotado'
            : 'Selecciona tu talla'}
        </p>
        <button
          className="button wide"
          disabled={!variant || variant.stock < 1}
          onClick={() => {
            if (variant) {
              add({
                variantId: variant.id,
                name: p.name,
                price: p.price,
                size,
                color,
                image: p.images[0]?.url || '',
                quantity: 1,
              });
              setAdded(true);
            }
          }}
        >
          {added ? (
            <>
              <Check size={18} /> Añadido a tu bolsa
            </>
          ) : (
            'Añadir a la bolsa'
          )}{' '}
          <ArrowUpRight size={18} />
        </button>
        {added && (
          <Link className="text-link" href="/cart">
            Ir a la bolsa →
          </Link>
        )}
        <details open>
          <summary>Material y cuidados</summary>
          <p>
            {p.material}. Limpieza profesional recomendada. Las especificaciones son ilustrativas en
            esta tienda demo.
          </p>
        </details>
        <details>
          <summary>Envíos y devoluciones</summary>
          <p>
            Envío demo gratuito a partir de 250 €. No se realizan envíos físicos. Consulta nuestras
            políticas de demostración.
          </p>
        </details>
      </div>
    </div>
  );
}
