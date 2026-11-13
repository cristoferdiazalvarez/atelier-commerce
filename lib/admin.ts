import { Prisma, type Role } from '@prisma/client';
import { z } from 'zod';
import { db } from './db';
import { idSchema } from './validation';
export function authorizeAdmin(role: Role, route: string) {
  if (!['ADMIN', 'STAFF'].includes(role)) throw new Error('FORBIDDEN:Acceso restringido.');
  if (process.env.ALLOW_ADMIN_WRITES !== 'true')
    throw new Error('FORBIDDEN:La administración pública es de solo lectura.');
  if (role !== 'ADMIN' && !['admin/inventory', 'admin/order'].includes(route))
    throw new Error('FORBIDDEN:Se requiere ADMIN.');
}
export const productSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(5000),
  material: z.string().min(2).max(200),
  price: z.number().int().min(100).max(10000000),
  categoryId: idSchema,
  collectionId: idSchema,
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});
export async function mutateAdmin(
  actor: { id: string; role: Role },
  route: string,
  body: Record<string, unknown>,
) {
  authorizeAdmin(actor.role, route);
  const id = body.id ? idSchema.parse(body.id) : undefined;
  return db.$transaction(async (tx) => {
    let entityId = id || 'store';
    if (route === 'admin/product') {
      const data = productSchema.parse(body);
      const product = id
        ? await tx.product.update({ where: { id }, data })
        : await tx.product.create({ data });
      entityId = product.id;
    } else if (route === 'admin/archive') {
      await tx.product.update({ where: { id: idSchema.parse(id) }, data: { active: false } });
    } else if (route === 'admin/variant') {
      const data = z
        .object({
          productId: idSchema,
          sku: z.string().min(3).max(100),
          size: z.string().min(1).max(30),
          color: z.string().min(1).max(50),
          active: z.boolean().default(true),
        })
        .parse(body);
      const variant = id
        ? await tx.variant.update({ where: { id, productId: data.productId }, data })
        : await tx.variant.create({ data });
      entityId = variant.id;
    } else if (route === 'admin/variant-delete') {
      const variant = await tx.variant.findUniqueOrThrow({
        where: { id: idSchema.parse(id) },
        include: { _count: { select: { lines: true, movements: true } } },
      });
      if (variant.stock !== 0 || variant._count.lines || variant._count.movements)
        throw new Error(
          'La variante tiene stock o historial. Desactívala para conservar la trazabilidad.',
        );
      await tx.variant.delete({ where: { id: variant.id } });
    } else if (route === 'admin/image') {
      const data = z
        .object({
          productId: idSchema,
          url: z
            .string()
            .max(2000)
            .refine(
              (s) =>
                (s.startsWith('/images/') && !s.includes('..')) || /^https:\/\/[^\s]+$/.test(s),
            ),
          alt: z.string().min(2).max(200),
          position: z.number().int().min(0).max(100),
        })
        .parse(body);
      const image = id
        ? await tx.productImage.update({ where: { id, productId: data.productId }, data })
        : await tx.productImage.create({ data });
      entityId = image.id;
    } else if (route === 'admin/image-delete') {
      await tx.productImage.delete({ where: { id: idSchema.parse(id) } });
    } else if (route === 'admin/inventory') {
      const data = z
        .object({
          variantId: idSchema,
          delta: z
            .number()
            .int()
            .min(-1000)
            .max(1000)
            .refine((n) => n !== 0),
          reason: z.string().min(3).max(200),
        })
        .parse(body);
      entityId = data.variantId;
      const updated = await tx.variant.updateMany({
        where: { id: data.variantId, ...(data.delta < 0 ? { stock: { gte: -data.delta } } : {}) },
        data: { stock: { increment: data.delta } },
      });
      if (!updated.count) throw new Error('Stock insuficiente.');
      await tx.inventoryMovement.create({ data });
    } else if (route === 'admin/order') {
      const status = z.enum(['PROCESSING', 'SHIPPED']).parse(body.status);
      const updated = await tx.order.updateMany({
        where: { id: idSchema.parse(id), status: status === 'PROCESSING' ? 'PAID' : 'PROCESSING' },
        data: { status },
      });
      if (!updated.count) throw new Error('Transición de pedido no permitida.');
    } else if (route === 'admin/coupon') {
      const data = z
        .object({
          code: z
            .string()
            .min(3)
            .max(40)
            .regex(/^[a-zA-Z0-9_-]+$/)
            .transform((s) => s.toUpperCase()),
          percent: z.number().int().min(1).max(70),
          active: z.boolean(),
          expiresAt: z.preprocess(
            (v) => (v ? new Date(String(v).length === 16 ? `${v}:00Z` : String(v)) : null),
            z.date().nullable(),
          ),
        })
        .parse(body);
      const coupon = id
        ? await tx.coupon.update({ where: { id }, data })
        : await tx.coupon.upsert({ where: { code: data.code }, create: data, update: data });
      entityId = coupon.id;
    } else if (['admin/category', 'admin/collection'].includes(route)) {
      const data = z
        .object({
          name: z.string().min(2).max(100),
          slug: z
            .string()
            .min(2)
            .max(100)
            .regex(/^[a-z0-9-]+$/),
        })
        .parse(body);
      const model = route === 'admin/category' ? 'category' : 'collection';
      const row =
        model === 'category'
          ? id
            ? await tx.category.update({ where: { id }, data })
            : await tx.category.create({ data })
          : id
            ? await tx.collection.update({ where: { id }, data })
            : await tx.collection.create({ data });
      entityId = row.id;
    } else if (['admin/category-delete', 'admin/collection-delete'].includes(route)) {
      const model = route === 'admin/category-delete' ? 'categoryId' : 'collectionId';
      if (await tx.product.count({ where: { [model]: idSchema.parse(id) } }))
        throw new Error('Reasigna los productos antes de eliminar esta agrupación.');
      if (model === 'categoryId') await tx.category.delete({ where: { id } });
      else await tx.collection.delete({ where: { id } });
    } else if (route === 'admin/settings') {
      const data = z
        .object({
          taxBps: z.number().int().min(0).max(3000),
          shipping: z.number().int().min(0).max(10000),
          freeShippingAt: z.number().int().min(0).max(1000000),
        })
        .parse(body);
      await tx.setting.update({ where: { id: 'store' }, data });
    } else throw new Error('Operación no encontrada.');
    await tx.audit.create({
      data: { actorId: actor.id, action: route, entityId, detail: body as Prisma.InputJsonValue },
    });
    return { ok: true, id: entityId };
  });
}
