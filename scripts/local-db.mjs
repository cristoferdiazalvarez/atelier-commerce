import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
const pg = new EmbeddedPostgres({
  databaseDir: '.local/postgres',
  user: 'atelier',
  password: 'atelier',
  port: 54329,
  persistent: true,
  autoRehydrateSymlinks: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: console.error,
});
if (!existsSync('.local/postgres/PG_VERSION')) await pg.initialise();
await pg.start();
const client = pg.getPgClient('postgres');
try {
  await client.connect();
  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', ['atelier']);
  if (!existing.rowCount) await client.query('CREATE DATABASE "atelier"');
} finally {
  await client.end();
}
console.log('Local PostgreSQL ready on 127.0.0.1:54329. Ctrl+C to stop.');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
