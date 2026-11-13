import { db } from './db';
import { pageNumber } from './validation';
export const productInclude = {
  images: { orderBy: { position: 'asc' as const } },
  variants: { where: { active: true } },
  category: true,
  collection: true,
};
export async function catalog(params: Record<string, string | undefined> = {}) {
  const page = pageNumber(params.page);
  const where = {
    active: true,
    ...(params.q ? { name: { contains: params.q, mode: 'insensitive' as const } } : {}),
    ...(params.category ? { category: { slug: params.category } } : {}),
    ...(params.collection ? { collection: { slug: params.collection } } : {}),
    ...(params.max
      ? {
          price: {
            lte: Math.min(10000000, Math.floor(Math.max(0, Number(params.max) || 0) * 100)),
          },
        }
      : {}),
    variants: {
      some: {
        active: true,
        ...(params.size ? { size: params.size } : {}),
        ...(params.color ? { color: params.color } : {}),
        ...(params.available === 'true' ? { stock: { gt: 0 } } : {}),
      },
    },
  };
  const [products, count, categories, collections] = await Promise.all([
    db.product.findMany({
      where,
      include: productInclude,
      orderBy:
        params.sort === 'price-asc'
          ? { price: 'asc' }
          : params.sort === 'price-desc'
            ? { price: 'desc' }
            : { createdAt: 'desc' },
      take: 9,
      skip: (page - 1) * 9,
    }),
    db.product.count({ where }),
    db.category.findMany(),
    db.collection.findMany(),
  ]);
  return { products, count, categories, collections, page };
}
export type CatalogProduct = Awaited<ReturnType<typeof catalog>>['products'][number];
