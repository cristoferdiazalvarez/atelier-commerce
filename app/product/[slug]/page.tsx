import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { productInclude } from '@/lib/catalog';
import { ProductDetail } from '@/components/product-detail';
import { ProductCard } from '@/components/product-card';
export const dynamic = 'force-dynamic';
export default async function Product({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug, active: true },
    include: productInclude,
  });
  if (!product) notFound();
  const related = await db.product.findMany({
    where: { active: true, id: { not: product.id }, categoryId: product.categoryId },
    include: productInclude,
    take: 4,
  });
  return (
    <section className="section">
      <div className="breadcrumb">
        <Link href="/catalog">La colección</Link> / {product.category.name} / {product.name}
      </div>
      <ProductDetail product={product} />
      {related.length > 0 && (
        <>
          <div className="section-heading">
            <h2>
              En buena <em>compañía.</em>
            </h2>
          </div>
          <div className="product-grid home-products">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
