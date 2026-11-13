import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
process.loadEnvFile('.env');
const source = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(source.hostname))
  throw new Error('This helper only creates a disposable database on local PostgreSQL.');
const db = new PrismaClient();
const name = `atelier_test_${Date.now()}`;
await db.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
source.pathname = `/${name}`;
const env = {
  ...process.env,
  DATABASE_URL: source.toString(),
  DIRECT_URL: source.toString(),
  APP_URL: 'http://localhost:3100',
  CI: 'true',
  DEMO_LOGIN: 'true',
  DEMO_CHECKOUT: 'true',
  ALLOW_ADMIN_WRITES: 'true',
  ADMIN_EMAIL: 'admin@example.test',
  ADMIN_PASSWORD: 'isolated-ci-fixture-password-123456',
  E2E_PRODUCTION: 'true',
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(npm, args, { stdio: 'inherit', env });
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${args.join(' ')} exited ${code}`)),
    );
    child.once('error', reject);
  });
}
try {
  for (const script of [
    'db:migrate',
    'db:seed',
    'lint',
    'typecheck',
    'test',
    'build',
    'test:e2e',
    'format:check',
  ])
    await run(['run', script]);
  console.log('All local checks passed in an isolated, disposable PostgreSQL database.');
} finally {
  await db.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await db.$disconnect();
}
