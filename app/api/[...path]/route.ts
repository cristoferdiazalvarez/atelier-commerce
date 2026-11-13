import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { hash, compare } from 'bcryptjs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { maintenance } from '@/lib/maintenance';
import { currentUser, requireUser, createSession, digest, rateLimit } from '@/lib/auth';
import { checkout, checkoutSchema, addressSchema, stripeClient, applyEvent } from '@/lib/orders';
import { mutateAdmin } from '@/lib/admin';
import { passwordSchema, idSchema, cartItemsSchema, syncSchema } from '@/lib/validation';
import { quoteOrder, quoteSchema } from '@/lib/quote';
import { readBody, sensitiveRateLimit } from '@/lib/http';
const credentials = z.object({
  email: z
    .email()
    .max(200)
    .transform((s) => s.toLowerCase()),
  password: passwordSchema,
  name: z.string().min(2).max(100).optional(),
});
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const route = (await params).path.join('/');
  try {
    if (route === 'stripe/webhook') {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) throw new Error('Stripe Test no está configurado.');
      const event = stripeClient().webhooks.constructEvent(
        await readBody(request, 1048576),
        request.headers.get('stripe-signature') || '',
        secret,
      );
      await applyEvent(event);
      return NextResponse.json({ received: true });
    }
    const origin = process.env.APP_URL
      ? new URL(process.env.APP_URL).origin
      : new URL(request.url).origin;
    if (process.env.VERCEL_ENV === 'production' && !origin.startsWith('https://'))
      throw new Error('Configuración HTTPS incorrecta.');
    if (request.headers.get('origin') !== origin)
      return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
    if (!request.headers.get('content-type')?.includes('application/json'))
      return NextResponse.json({ error: 'Se requiere JSON.' }, { status: 415 });
    const body = z.record(z.string(), z.unknown()).parse(JSON.parse(await readBody(request)));
    if (route.startsWith('auth/')) {
      await sensitiveRateLimit(request);
      if (route === 'auth/demo') {
        if (process.env.DEMO_LOGIN !== 'true') throw new Error('El acceso demo está desactivado.');
        const user = await db.user.create({
          data: {
            email: `visitor-${randomBytes(16).toString('hex')}@example.test`,
            name: 'Visitante Demo',
            passwordHash: await hash(randomBytes(32).toString('hex'), 12),
          },
        });
        await createSession(user.id);
        return NextResponse.json({ ok: true });
      }
      if (route === 'auth/reset') {
        const token = z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .parse(body.token),
          password = passwordSchema.parse(body.password);
        await rateLimit(`reset:${digest(token)}`);
        const passwordHash = await hash(password, 12);
        await db.$transaction(async (tx) => {
          const reset = await tx.passwordReset.findUnique({ where: { id: digest(token) } });
          if (!reset || reset.expiresAt < new Date())
            throw new Error('Enlace caducado o no válido.');
          await tx.passwordReset.delete({ where: { id: reset.id } });
          await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
          await tx.session.deleteMany({ where: { userId: reset.userId } });
        });
        return NextResponse.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
      }
      if (['auth/login', 'auth/register', 'auth/recover'].includes(route)) {
        const email = z.email().max(200).parse(body.email).toLowerCase();
        await rateLimit(`auth:${email}`);
        if (route === 'auth/recover') {
          if (process.env.NODE_ENV === 'production')
            return NextResponse.json(
              {
                error:
                  'La recuperación por email no está habilitada en esta demo. Utiliza una nueva sesión de visitante.',
              },
              { status: 503 },
            );
          const user = await db.user.findUnique({ where: { email } });
          if (user) {
            const token = randomBytes(32).toString('hex');
            await db.passwordReset.create({
              data: {
                id: digest(token),
                userId: user.id,
                expiresAt: new Date(Date.now() + 1800000),
              },
            });
            console.info(
              `LOCAL TEST ONLY password reset for ${email}: ${origin}/account?reset=${token}`,
            );
          }
          return NextResponse.json({
            message:
              'Si la cuenta existe, se ha generado un enlace de prueba en el terminal del servidor local.',
          });
        }
        const data = credentials.parse(body);
        let user = await db.user.findUnique({ where: { email: data.email } });
        if (route === 'auth/register') {
          if (user) throw new Error('No se puede registrar esta cuenta.');
          user = await db.user.create({
            data: {
              email: data.email,
              name: data.name || 'Cliente Atelier',
              passwordHash: await hash(data.password, 12),
            },
          });
        } else {
          const valid = await compare(
            data.password,
            user?.passwordHash || '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
          );
          if (!user || !valid) throw new Error('Credenciales incorrectas.');
        }
        await createSession(user!.id);
        return NextResponse.json({ ok: true });
      }
    }
    const user = await requireUser(route.startsWith('admin/'));
    if (route === 'auth/logout') {
      const token = (await cookies()).get('atelier_session')?.value;
      if (token) await db.session.deleteMany({ where: { id: digest(token) } });
      (await cookies()).delete('atelier_session');
      return NextResponse.json({ ok: true });
    }
    if (route === 'quote') {
      await rateLimit(`quote:${user.id}`, 120);
      return NextResponse.json(await quoteOrder(quoteSchema.parse(body)));
    }
    if (route === 'checkout') {
      await rateLimit(`checkout:${user.id}`, 30);
      return NextResponse.json(await checkout(user.id, checkoutSchema.parse(body)));
    }
    if (route === 'profile') {
      await db.user.update({
        where: { id: user.id },
        data: { name: z.string().min(2).max(100).parse(body.name) },
      });
      return NextResponse.json({ ok: true });
    }
    if (route === 'addresses') {
      const id = body.id ? idSchema.parse(body.id) : undefined,
        data = addressSchema.parse(body);
      if (id) {
        const result = await db.address.updateMany({ where: { id, userId: user.id }, data });
        if (!result.count) throw new Error('FORBIDDEN:Dirección no disponible.');
      } else {
        if ((await db.address.count({ where: { userId: user.id } })) >= 20)
          throw new Error('Límite de 20 direcciones alcanzado.');
        await db.address.create({ data: { ...data, userId: user.id } });
      }
      return NextResponse.json({ ok: true });
    }
    if (route === 'addresses/delete') {
      const result = await db.address.deleteMany({
        where: { id: idSchema.parse(body.id), userId: user.id },
      });
      if (!result.count) throw new Error('FORBIDDEN:Dirección no disponible.');
      return NextResponse.json({ ok: true });
    }
    if (route === 'sync' || route === 'cart') {
      const parsed =
        route === 'sync'
          ? syncSchema.parse(body)
          : { items: cartItemsSchema.parse(body.items), favorites: undefined };
      await db.$transaction(async (tx) => {
        const valid = await tx.variant.count({
          where: {
            id: { in: parsed.items.map((i) => i.variantId) },
            active: true,
            product: { active: true },
          },
        });
        if (valid !== parsed.items.length)
          throw new Error('Alguna pieza ya no está disponible. Elimínala de tu bolsa.');
        await tx.cartItem.deleteMany({ where: { userId: user.id } });
        await tx.cartItem.createMany({
          data: parsed.items.map((i) => ({ ...i, userId: user.id })),
        });
        if (parsed.favorites) {
          const products = await tx.product.findMany({
            where: { id: { in: parsed.favorites }, active: true },
            select: { id: true },
          });
          await tx.favorite.deleteMany({ where: { userId: user.id } });
          await tx.favorite.createMany({
            data: products.map((p) => ({ userId: user.id, productId: p.id })),
            skipDuplicates: true,
          });
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (route.startsWith('admin/')) return NextResponse.json(await mutateAdmin(user, route, body));
    return NextResponse.json({ error: 'Ruta no encontrada.' }, { status: 404 });
  } catch (error) {
    const databaseError =
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientValidationError;
    const message = databaseError
      ? 'No se pudo completar la operación. Revisa los datos y vuelve a intentarlo.'
      : error instanceof z.ZodError || error instanceof SyntaxError
        ? 'Revisa los datos del formulario.'
        : error instanceof Error
          ? error.message
          : 'Error inesperado.';
    const status = message.startsWith('AUTH:')
      ? 401
      : message.startsWith('FORBIDDEN:')
        ? 403
        : message.startsWith('RATE:')
          ? 429
          : message.startsWith('SIZE:')
            ? 413
            : 400;
    return NextResponse.json(
      { error: message.replace(/^(AUTH|FORBIDDEN|RATE|SIZE):/, '') },
      { status, headers: status === 429 ? { 'Retry-After': '900' } : {} },
    );
  }
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    if ((await params).path.join('/') === 'ops/maintenance') {
      const secret = process.env.CRON_SECRET;
      if (!secret || secret.length < 32)
        return NextResponse.json({ error: 'Maintenance is not configured.' }, { status: 503 });
      const expected = Buffer.from(`Bearer ${secret}`),
        provided = Buffer.from(request.headers.get('authorization') || '');
      if (expected.length !== provided.length || !timingSafeEqual(expected, provided))
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return NextResponse.json(await maintenance(), { headers: { 'Cache-Control': 'no-store' } });
    }
    const user = await currentUser();
    if ((await params).path.join('/') === 'sync') {
      if (!user) return NextResponse.json({ error: 'Inicia sesión.' }, { status: 401 });
      const [cart, favorites] = await Promise.all([
        db.cartItem.findMany({
          where: { userId: user.id, variant: { active: true, product: { active: true } } },
          include: {
            variant: {
              include: {
                product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } },
              },
            },
          },
        }),
        db.favorite.findMany({ where: { userId: user.id, product: { active: true } } }),
      ]);
      return NextResponse.json(
        {
          items: cart.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            size: i.variant.size,
            color: i.variant.color,
            name: i.variant.product.name,
            price: i.variant.product.price,
            image: i.variant.product.images[0]?.url || '',
          })),
          favorites: favorites.map((f) => f.productId),
        },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    return NextResponse.json(
      { user: user ? { id: user.id, name: user.name, role: user.role } : null },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Servicio temporalmente no disponible.' }, { status: 503 });
  }
}
