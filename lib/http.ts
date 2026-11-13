import type { NextRequest } from 'next/server';
import { rateLimit } from './auth';
export async function readBody(request: NextRequest, maximum = 32768) {
  if (Number(request.headers.get('content-length')) > maximum)
    throw new Error('SIZE:Solicitud demasiado grande.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Solicitud vacía.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new Error('SIZE:Solicitud demasiado grande.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
export async function sensitiveRateLimit(request: NextRequest) {
  // Trust platform-overwritten client IP only on Vercel. Direct/local deployments use a shared bucket.
  const ip =
    process.env.VERCEL === '1'
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()
      : 'local';
  await rateLimit(`edge-auth:${ip || 'unknown'}`, process.env.CI ? 1000 : 100);
}
