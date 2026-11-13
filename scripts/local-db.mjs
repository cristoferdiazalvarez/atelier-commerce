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
try {
  await pg.createDatabase('atelier');
} catch (error) {
  if (!String(error).includes('already exists')) throw error;
}
console.log('Local PostgreSQL ready on 127.0.0.1:54329. Ctrl+C to stop.');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    await pg.stop();
    process.exit(0);
  });
setInterval(() => {}, 60000);
