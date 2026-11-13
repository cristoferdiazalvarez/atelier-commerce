import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin = new URL(process.argv[2] || '');
assert.equal(origin.protocol, 'https:', 'A real HTTPS deployment URL is required.');
assert.equal(origin.pathname, '/', 'Pass the production origin only.');
const base = origin.origin;
const response = await fetch(base);
assert.equal(response.status, 200, 'Public home must work without owner authentication.');
await mkdir('test-results/hosted', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'La elegancia de lo esencial.' }).waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: `test-results/hosted/home-${name}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Explorar la colección' }).click();
    await page.getByRole('textbox', { name: 'Buscar', exact: true }).fill('Blazer');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await page.locator('.product-card').first().waitFor();
    assert.equal(await page.locator('.product-card').count(), 1);
    await page
      .locator('.product-card')
      .getByRole('button', { name: /Añadir a favoritos/ })
      .click();
    await page.reload();
    await page.locator('.product-card button[aria-pressed="true"]').waitFor();
    await page.locator('.product-caption a').click();
    let selected = false;
    for (const size of ['S', 'M', 'L', 'XS']) {
      const button = page.getByRole('button', { name: size, exact: true });
      if (await button.isEnabled()) {
        await button.click();
        selected = true;
        break;
      }
    }
    assert.equal(selected, true, 'The demo product must have an available variant.');
    await page.getByRole('button', { name: 'Añadir a la bolsa' }).click();
    await page.getByRole('link', { name: 'Ir a la bolsa' }).click();
    await page.reload();
    await page.getByRole('heading', { name: 'Blazer esencial' }).waitFor();
    await page.getByRole('link', { name: 'Entrar o crear cuenta' }).click();
    await page.getByRole('button', { name: 'Explorar con una cuenta demo' }).click();
    await page.getByRole('heading', { name: 'Hola, Visitante Demo.' }).waitFor();
    const session = (await context.cookies()).find((c) => c.name === 'atelier_session');
    assert.ok(session?.httpOnly && session.secure && session.sameSite === 'Lax');
    await page.goto(`${base}/cart`);
    await page.getByLabel('Nombre', { exact: true }).fill('Visitante QA');
    await page.getByLabel('Dirección', { exact: true }).fill('Calle Demo 1');
    await page.getByLabel('Ciudad', { exact: true }).fill('Ciudad Demo');
    await page.getByLabel('Código postal', { exact: true }).fill('00000');
    await page.getByLabel('Cupón', { exact: true }).fill('WELCOME10');
    await page.waitForFunction(() =>
      document.querySelector('.total dd')?.textContent?.includes('275,81'),
    );
    assert.equal(
      await page.getByRole('option', { name: /Stripe TEST/ }).count(),
      0,
      'Initial public demo must not expose a payment processor.',
    );
    await page.screenshot({ path: `test-results/hosted/checkout-${name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Crear pedido de prueba' }).click();
    await page.getByText('Simulación sin pago ni envío.').first().waitFor();
    await page.getByText('DEMO_UNPAID').first().waitFor();
    await page.screenshot({ path: `test-results/hosted/order-${name}.png`, fullPage: true });
    await page.goto(`${base}/cart`);
    await page.getByRole('heading', { name: 'Tu bolsa, un comienzo.' }).waitFor();
    const denied = await context.request.post(`${base}/api/admin/settings`, {
      headers: { origin: base },
      data: { taxBps: 0, shipping: 0, freeShippingAt: 0 },
    });
    assert.equal(denied.status(), 403);
    const csrf = await context.request.post(`${base}/api/auth/register`, {
      headers: { origin: 'https://foreign.example' },
      data: {},
    });
    assert.equal(csrf.status(), 403);
    const maintenance = await context.request.get(`${base}/api/ops/maintenance`);
    assert.equal(maintenance.status(), 401);
    await page.goto(`${base}/account?tab=favorites`);
    await page.locator('.product-card').waitFor();
    assert.equal(await page.locator('.product-card').count(), 1);
    await page.goto(`${base}/account`);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByRole('button', { name: 'Iniciar sesión' }).waitFor();
    const replay = await fetch(`${base}/api/me`, {
      headers: { cookie: `atelier_session=${session.value}` },
    });
    assert.equal((await replay.json()).user, null, 'Logged-out sessions must be revoked.');
    assert.equal(
      (
        await context.request.post(`${base}/api/admin/settings`, {
          headers: { origin: base },
          data: {},
        })
      ).status(),
      401,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await context.close();
    results.push({
      viewport: name,
      publicHttps: true,
      catalog: true,
      persistentBag: true,
      persistentFavorites: true,
      isolatedDemoLogin: true,
      secureCookies: true,
      serverDiscountTaxShipping: true,
      unpaidDemoOrder: true,
      adminDenied: true,
      csrfDenied: true,
      maintenanceProtected: true,
      logoutRevoked: true,
      noHorizontalOverflow: true,
    });
    console.log(`${name}: public HTTPS shopping and authorization acceptance passed.`);
  }
  const report = { origin: base, checkedAt: new Date().toISOString(), results };
  await writeFile('test-results/hosted/report.json', JSON.stringify(report, null, 2));
  console.log(
    'Hosted acceptance passed; only fictional customer/demo-order data was created. No payment was attempted.',
  );
} finally {
  await browser.close();
}
