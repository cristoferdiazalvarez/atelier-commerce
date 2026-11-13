import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import net from 'node:net';
if (!existsSync('.env')) throw new Error('Configure .env using .env.example first.');
process.loadEnvFile('.env');
const url = new URL(process.env.DATABASE_URL);
let database;
async function databaseReady() {
  return new Promise((resolve) => {
    const socket = net.connect(54329, '127.0.0.1');
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}
if (
  ['localhost', '127.0.0.1'].includes(url.hostname) &&
  url.port === '54329' &&
  !(await databaseReady())
) {
  database = spawn(process.execPath, ['scripts/local-db.mjs'], { stdio: 'inherit' });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (database.exitCode !== null) break;
    ready = await databaseReady();
    if (ready) break;
    await setTimeout(200);
  }
  if (!ready) {
    database.kill('SIGTERM');
    throw new Error('Local PostgreSQL failed to start.');
  }
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const app = spawn(npm, ['run', 'dev'], { stdio: 'inherit' });
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  app.kill('SIGTERM');
  database?.kill('SIGTERM');
};
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
app.once('exit', () => database?.kill('SIGTERM'));
