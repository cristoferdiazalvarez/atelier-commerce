import { test, expect } from '@playwright/test';
test('editorial navigation, query filters and variant bag', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'La elegancia de lo esencial.' })).toBeVisible();
  await page.getByRole('link', { name: 'Explorar la colección' }).click();
  await page.getByRole('textbox', { name: 'Buscar', exact: true }).fill('Blazer');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.locator('.product-caption a').first().click();
  await page.getByRole('button', { name: 'S', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir a la bolsa' }).click();
  await page.getByRole('link', { name: 'Ir a la bolsa' }).click();
  await expect(page.getByRole('heading', { name: 'Blazer esencial' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Blazer esencial' })).toBeVisible();
});
test('registration, demo checkout and real order history', async ({ page }) => {
  const email = `e2e-${crypto.randomUUID()}@example.test`;
  await page.goto('/account');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).first().click();
  await page.getByLabel('Nombre', { exact: true }).fill('Demo Customer');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('TestPassword-12345');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Hola, Demo Customer.' })).toBeVisible();
  await page.goto('/product/blazer-esencial');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir a la bolsa' }).click();
  await page.goto('/cart');
  await page.getByLabel('Nombre', { exact: true }).fill('Demo Customer');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle de prueba 10');
  await page.getByLabel('Ciudad', { exact: true }).fill('Ciudad Demo');
  await page.getByLabel('Código postal', { exact: true }).fill('12345');
  await page.getByLabel('Cupón', { exact: true }).fill('WELCOME10');
  await expect(page.locator('.total dd')).toHaveText(/275,81/);
  await page.getByRole('button', { name: 'Crear pedido de prueba' }).click();
  await expect(page.getByText('Simulación sin pago ni envío.').first()).toBeVisible();
  await expect(page.getByText('DEMO_UNPAID').first()).toBeVisible();
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Tu bolsa, un comienzo.' })).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Espacio privado.' })).toBeVisible();
  const response = await page.request.post('/api/admin/settings', {
    headers: { origin: process.env.APP_URL || 'http://localhost:3000' },
    data: { taxBps: 0, shipping: 0, freeShippingAt: 0 },
  });
  expect(response.status()).toBe(403);
});
test('anonymous server authorization and CSRF', async ({ request }) => {
  const denied = await request.post('/api/admin/product', {
    headers: { origin: process.env.APP_URL || 'http://localhost:3000' },
    data: {},
  });
  expect(denied.status()).toBe(401);
  const csrf = await request.post('/api/auth/register', {
    headers: { origin: 'https://foreign.example' },
    data: {},
  });
  expect(csrf.status()).toBe(403);
});
test('private administrator can edit audited inventory', async ({ page }) => {
  test.skip(!process.env.ADMIN_PASSWORD, 'Private local credentials required');
  await page.goto('/account');
  await page.getByLabel('Email', { exact: true }).fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel('Contraseña', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('link', { name: 'Administración' })).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Una visión completa.' })).toBeVisible();
  await page.locator('.admin-product summary').first().click();
  const form = page
    .locator('form')
    .filter({ has: page.getByLabel('Cambio (+/-)').first() })
    .first();
  await form.getByLabel('Cambio (+/-)').fill('1');
  await form.getByLabel('Motivo').fill('E2E inventory verification');
  await form.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByText('E2E inventory verification').first()).toBeVisible();
});

test('favorite synchronization, address ownership and account isolation', async ({
  page,
  browser,
}) => {
  const origin = process.env.APP_URL || 'http://localhost:3000';
  await page.goto('/catalog');
  await page
    .locator('.product-card')
    .first()
    .getByRole('button', { name: /Añadir a favoritos/ })
    .click();
  const registration = await page.request.post('/api/auth/register', {
    headers: { origin },
    data: {
      email: `favorite-${crypto.randomUUID()}@example.test`,
      password: 'Favorite-test-12345',
      name: 'Favorite Customer',
    },
  });
  expect(registration.ok()).toBe(true);
  await page.goto('/account?tab=favorites');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect
    .poll(
      async () =>
        ((await (await page.request.get('/api/sync')).json()).favorites as string[]).length,
    )
    .toBe(1);
  await page.reload();
  await expect(page.locator('.product-card')).toHaveCount(1);
  const address = {
    name: 'Fictional Customer',
    line1: 'Test Address 42',
    city: 'Demo City',
    postalCode: '12345',
    country: 'ES',
  };
  expect(
    (await page.request.post('/api/addresses', { headers: { origin }, data: address })).ok(),
  ).toBe(true);
  await page.goto('/account');
  await expect(
    page.locator('.address').filter({ hasText: 'Test Address 42' }).first(),
  ).toBeVisible();
  const addressId = await page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Eliminar dirección' }) })
    .locator('input[name="id"]')
    .inputValue();
  const other = await browser.newContext({ baseURL: origin });
  await other.request.post('/api/auth/demo', { headers: { origin }, data: {} });
  const denied = await other.request.post('/api/addresses', {
    headers: { origin },
    data: { ...address, id: addressId, line1: 'Unauthorized edit' },
  });
  expect(denied.status()).toBe(403);
  expect(
    (
      await other.request.post('/api/addresses/delete', {
        headers: { origin },
        data: { id: addressId },
      })
    ).status(),
  ).toBe(403);
  const otherSync = await (await other.request.get('/api/sync')).json();
  expect(otherSync.favorites).toEqual([]);
  await other.close();
  expect(
    (
      await page.request.post('/api/addresses', {
        headers: { origin },
        data: { ...address, id: addressId, line1: 'Updated Test Address' },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await expect(
    page.locator('.address').filter({ hasText: 'Updated Test Address' }).first(),
  ).toBeVisible();
  expect(
    (
      await page.request.post('/api/addresses/delete', {
        headers: { origin },
        data: { id: addressId },
      })
    ).ok(),
  ).toBe(true);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  await page.goto('/account?tab=favorites');
  await expect(page.locator('.product-card')).toHaveCount(0);
});

test('demo account is private and has only customer permissions', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('button', { name: 'Explorar con una cuenta demo' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Visitante Demo.' })).toBeVisible();
  const user = await (await page.request.get('/api/me')).json();
  expect(user.user.role).toBe('CUSTOMER');
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === 'atelier_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Lax');
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Espacio privado.' })).toBeVisible();
});

test('password reset is single-use and revokes old sessions', async ({ page }) => {
  const origin = process.env.APP_URL || 'http://localhost:3000';
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  const { createHash } = await import('node:crypto');
  const token = crypto.randomUUID().replaceAll('-', '').repeat(2);
  const email = `reset-${crypto.randomUUID()}@example.test`;
  await page.request.post('/api/auth/register', {
    headers: { origin },
    data: { email, name: 'Reset Customer', password: 'Original-password-12345' },
  });
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  try {
    await db.passwordReset.create({
      data: {
        id: createHash('sha256').update(token).digest('hex'),
        userId: user.id,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const result = await page.request.post('/api/auth/reset', {
      headers: { origin },
      data: { token, password: 'Updated-password-12345' },
    });
    expect(result.ok()).toBe(true);
    expect((await (await page.request.get('/api/me')).json()).user).toBeNull();
    const repeated = await page.request.post('/api/auth/reset', {
      headers: { origin },
      data: { token, password: 'Updated-again-12345' },
    });
    expect(repeated.status()).toBe(400);
    const login = await page.request.post('/api/auth/login', {
      headers: { origin },
      data: { email, password: 'Updated-password-12345' },
    });
    expect(login.ok()).toBe(true);
  } finally {
    await db.$disconnect();
  }
});

test('administrator product, variant, image and coupon lifecycle', async ({ page }) => {
  const origin = process.env.APP_URL || 'http://localhost:3000';
  const post = async (path: string, data: unknown) => {
    const response = await page.request.post(`/api/${path}`, { headers: { origin }, data });
    expect(response.ok(), `${path}: ${await response.text()}`).toBe(true);
    return response.json();
  };
  await post('auth/login', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  const slug = `qa-${crypto.randomUUID()}`;
  const category = await post('admin/category', { name: slug, slug });
  const collection = await post('admin/collection', { name: slug, slug });
  const data = {
    name: `QA ${slug}`,
    slug,
    description: 'An isolated administration product fixture.',
    material: 'Test cotton',
    price: 12345,
    categoryId: category.id,
    collectionId: collection.id,
    active: true,
    featured: false,
  };
  const product = await post('admin/product', data);
  const variant = await post('admin/variant', {
    productId: product.id,
    sku: slug,
    size: 'M',
    color: 'Arena',
  });
  await post('admin/variant', {
    id: variant.id,
    productId: product.id,
    sku: slug,
    size: 'L',
    color: 'Negro',
    active: true,
  });
  const image = await post('admin/image', {
    productId: product.id,
    url: '/images/photo-1591047139829-d91aecb6caea.jpg',
    alt: 'QA garment',
    position: 0,
  });
  await post('admin/image', {
    id: image.id,
    productId: product.id,
    url: '/images/photo-1591047139829-d91aecb6caea.jpg',
    alt: 'Updated QA garment',
    position: 2,
  });
  await post('admin/inventory', { variantId: variant.id, delta: 3, reason: 'QA stock lifecycle' });
  await page.goto(`/admin?q=${encodeURIComponent(slug)}`);
  await page.locator('.admin-product > summary').click();
  const productForm = page.locator('.admin-product > form').first();
  await productForm.getByLabel('Precio (céntimos)').fill('12999');
  await productForm.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(productForm.getByRole('status')).toHaveText('Guardado.');
  await page.goto(`/product/${slug}`);
  await expect(page.getByRole('heading', { name: data.name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'L', exact: true })).toBeEnabled();
  const inUse = await page.request.post('/api/admin/category-delete', {
    headers: { origin },
    data: { id: category.id },
  });
  expect(inUse.status()).toBe(400);
  await post('admin/variant', {
    id: variant.id,
    productId: product.id,
    sku: slug,
    size: 'L',
    color: 'Negro',
    active: false,
  });
  const noHistory = await post('admin/variant', {
    productId: product.id,
    sku: `${slug}-empty`,
    size: 'S',
    color: 'Arena',
  });
  await post('admin/variant-delete', { id: noHistory.id });
  await post('admin/image-delete', { id: image.id });
  const coupon = await post('admin/coupon', {
    code: slug.slice(0, 35),
    percent: 15,
    active: true,
    expiresAt: '2030-01-01T00:00',
  });
  await post('admin/coupon', {
    id: coupon.id,
    code: slug.slice(0, 35),
    percent: 20,
    active: false,
    expiresAt: '',
  });
  await post('admin/archive', { id: product.id });
  // Next.js streams not-found boundaries with HTTP 200 after the shell has started.
  await page.goto(`/product/${slug}`);
  await expect(page.getByRole('heading', { name: 'El camino hacia algo nuevo.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', 'noindex');
  const empty = await post('admin/category', { name: `empty-${slug}`, slug: `empty-${slug}` });
  await post('admin/category-delete', { id: empty.id });
});
