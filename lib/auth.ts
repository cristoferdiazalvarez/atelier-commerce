import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export async function currentUser() {
  const token = (await cookies()).get('atelier_session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: digest(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new Error('AUTH:Inicia sesión para continuar.');
  if (admin && !['STAFF', 'ADMIN'].includes(user.role))
    throw new Error('FORBIDDEN:Acceso restringido.');
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { id: digest(token), userId, expiresAt } });
  (await cookies()).set('atelier_session', token, {
    httpOnly: true,
    secure: process.env.APP_URL?.startsWith('https://') ?? false,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}
export async function rateLimit(key: string, limit = 10, windowMs = 900000) {
  const now = new Date(),
    resetAt = new Date(now.getTime() + windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key","count","resetAt") VALUES (${digest(key)},1,${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
    "count"=CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count"+1 END,
    "resetAt"=CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  if (rows[0].count > limit) throw new Error('RATE:Demasiados intentos. Prueba en 15 minutos.');
}
