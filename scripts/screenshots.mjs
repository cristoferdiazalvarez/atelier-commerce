import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const base = process.env.APP_URL || 'http://localhost:3000';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
await page.goto(base, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'docs/home-desktop.png', fullPage: true });
const images = await page
  .locator('img')
  .evaluateAll((imgs) =>
    imgs.map((i) => ({ src: i.src, loaded: i.complete && i.naturalWidth > 0 })),
  );
console.log(JSON.stringify(images));
await page.goto(`${base}/catalog`, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'docs/catalog-desktop.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'docs/home-mobile.png', fullPage: true });
console.log(
  'Mobile horizontal overflow:',
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const response = await page.request.post(`${base}/api/auth/login`, {
    headers: { origin: base },
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  if (!response.ok()) throw new Error('Private screenshot administrator login failed.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'docs/admin-desktop.png', fullPage: false });
}
await browser.close();
