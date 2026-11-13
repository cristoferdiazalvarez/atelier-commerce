/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, MoveRight } from 'lucide-react';
import { db } from '@/lib/db';
import { productInclude } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const products = await db.product.findMany({
    where: { active: true, featured: true },
    include: productInclude,
    take: 4,
    orderBy: { createdAt: 'asc' },
  });
  return (
    <>
      <section className="hero">
        <img
          className="hero-photo"
          src="/images/photo-1483985988355-763728e1935b.jpg"
          alt="Estilo urbano y prendas de tonos neutros"
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-top">
          <span>ESTUDIO DE ESTILO · VOL. 01</span>
          <span>OTOÑO / INVIERNO 2026</span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">THE CONSIDERED WARDROBE</p>
          <h1>
            La elegancia
            <br />
            de lo <em>esencial.</em>
          </h1>
          <p>
            Formas honestas. Texturas que hablan.
            <br />
            Piezas que trascienden el momento.
          </p>
          <Link className="button light" href="/catalog">
            Explorar la colección <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="hero-bottom">
          <span>
            VOL. 01 <span className="hero-line" />
          </span>
          <a href="#selection" aria-label="Ver selección">
            <ArrowDown size={19} />
          </a>
          <span>MENOS, PERO MEJOR.</span>
        </div>
      </section>
      <div className="values-strip">
        <span>Diseño atemporal</span>
        <i />
        <span>Materiales con carácter</span>
        <i />
        <span>Detalles que importan</span>
        <i />
        <span>Una nueva perspectiva</span>
      </div>
      <section id="selection" className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EL ARTE DE ELEGIR</p>
            <h2>
              Una selección <em>con intención.</em>
            </h2>
          </div>
          <Link className="text-link" href="/catalog">
            Ver todas las piezas <MoveRight size={20} />
          </Link>
        </div>
        <div className="product-grid home-products">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section className="editorial">
        <div className="editorial-image">
          <img
            src="/images/photo-1445205170230-053b83016050.jpg"
            alt="Texturas y prendas cuidadosamente seleccionadas"
            loading="lazy"
          />
          <span>ATELIER JOURNAL — Nº 001</span>
        </div>
        <div className="editorial-copy">
          <p className="eyebrow">MÁS ALLÁ DE LAS TEMPORADAS</p>
          <h2>
            Vestir bien.
            <br />
            <em>Elegir mejor.</em>
          </h2>
          <p>
            Creemos en un guardarropa que evoluciona contigo. En las líneas limpias, los materiales
            que invitan al tacto y esa sensación de encontrar exactamente lo que buscabas.
          </p>
          <Link className="text-link" href="/policies">
            Nuestra filosofía <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      <section className="closing">
        <p className="eyebrow">EL LUJO DE LA SENCILLEZ</p>
        <h2>
          No se trata de tener más.
          <br />
          Se trata de <em>sentir más.</em>
        </h2>
        <Link href="/catalog" className="text-link">
          Encuentra tu próxima pieza <MoveRight size={20} />
        </Link>
      </section>
    </>
  );
}
