import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
test.afterEach(async ({ page }, testInfo) => {
  const request = page.context().request;
  const customer = testInfo.annotations.find((a) => a.type === 'test-customer')?.description;
  const fixture = testInfo.annotations.find((a) => a.type === 'catalog-fixture')?.description;
  if (!customer && !fixture) return;
  const me = await request.get('/api/auth/me');
  if (!me.ok()) return;
  const user = await me.json();
  const headers = { 'X-CSRF-Token': user.csrf_token };
  if (fixture) {
    const recommendations = await (await request.get('/api/manage/recommendations')).json();
    for (const r of recommendations.filter((r) => r.product_name.includes(fixture))) {
      expect(
        (await request.delete('/api/manage/recommendations/' + r.id, { headers })).ok(),
      ).toBeTruthy();
    }
    const products = await (await request.get('/api/manage/products')).json();
    for (const p of products.filter((p) => p.name.includes(fixture))) {
      expect((await request.delete('/api/manage/products/' + p.id, { headers })).ok()).toBeTruthy();
    }
    const categories = await (await request.get('/api/categories')).json();
    for (const c of categories.filter((c) => c.name.includes(fixture))) {
      expect(
        (await request.delete('/api/manage/categories/' + c.id, { headers })).ok(),
      ).toBeTruthy();
    }
  }
  if (!customer) return;
  const orders = await (await request.get('/api/orders')).json();
  for (const order of orders.filter(
    (o) => o.customer_name === customer && o.status === 'pending',
  )) {
    const response = await request.delete('/api/orders/' + order.id, {
      headers: { 'X-CSRF-Token': user.csrf_token },
    });
    expect(response.ok()).toBeTruthy();
  }
});
test('admin product, category and recommendation forms update the public catalog', async ({
  page,
  request,
}, testInfo) => {
  await login(page, 'admin');
  const marker = 'E2E ' + randomBytes(4).toString('hex');
  testInfo.annotations.push({ type: 'catalog-fixture', description: marker });
  await navigate(page, 'Kategori');
  await page.getByRole('button', { name: 'Tambah kategori' }).click();
  await page.getByLabel('Nama kategori').fill(marker + ' momen');
  await page.getByLabel('Deskripsi', { exact: true }).fill('Momen integrasi browser');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: marker + ' momen' })).toBeVisible();
  await navigate(page, 'Produk');
  await page.getByRole('button', { name: 'Tambah produk' }).click();
  await page.getByLabel('Nama produk').fill(marker + ' bouquet');
  await page.getByLabel('Harga (Rp)').fill('320000');
  await page.getByLabel('Ukuran', { exact: true }).fill('Medium');
  await page.getByLabel('Jenis bunga').fill('Mawar');
  await page.getByLabel('Deskripsi', { exact: true }).fill('Produk uji katalog');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const productRow = page.locator('tr').filter({ hasText: marker + ' bouquet' });
  await expect(productRow).toContainText('320.000');
  await productRow.getByRole('button', { name: 'Edit ' + marker + ' bouquet' }).click();
  await page.getByLabel('Harga (Rp)').fill('350000');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(productRow).toContainText('350.000');
  await navigate(page, 'Rekomendasi');
  await page.getByRole('button', { name: 'Tambah rekomendasi' }).click();
  await page
    .getByRole('combobox', { name: 'Kategori', exact: true })
    .selectOption({ label: marker + ' momen' });
  await page
    .getByRole('combobox', { name: 'Produk', exact: true })
    .selectOption({ label: marker + ' bouquet' });
  await page.getByLabel('Alasan rekomendasi').fill('Kurasi browser');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('tr').filter({ hasText: marker + ' bouquet' })).toContainText(
    'Kurasi browser',
  );
  const categories = await (await request.get('/api/categories')).json();
  const category = categories.find((c) => c.name === marker + ' momen');
  const products = await (await request.get('/api/products?category=' + category.id)).json();
  expect(products).toHaveLength(1);
  expect(products[0].name).toBe(marker + ' bouquet');
  expect(Number(products[0].price)).toBe(350000);
});
test('customer can browse, search, filter and read complete product details', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/catalog');
  await expect(
    page.getByRole('heading', { name: 'Bunga yang indah. Cerita yang bermakna.' }),
  ).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(9);
  await page.getByRole('link', { name: 'Occasion', exact: true }).click();
  await page.locator('.filter-tabs').getByRole('button', { name: 'Pernikahan' }).click();
  await expect(page.locator('.product-card')).toHaveCount(7);
  await page
    .locator('.product-card')
    .filter({ hasText: 'Ivory Wedding' })
    .locator('.product-picture')
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Large · 24 tangkai')).toBeVisible();
  await page.getByRole('button', { name: 'Tutup', exact: true }).click();
  await page.locator('.filter-tabs').getByRole('button', { name: 'Semua koleksi' }).click();
  await page.getByRole('textbox', { name: 'Cari produk' }).fill('Rosy');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Cari produk' }).fill('produk tidak ada');
  await expect(page.getByText('Belum ada produk yang sesuai.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Cari produk' }).fill('');
  await expect(page.locator('.product-card')).toHaveCount(9);
  await page.evaluate(() => scrollTo(0, 0));
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({
    path: `docs/screenshots/catalog-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
async function login(page, role) {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(role);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env[role === 'admin' ? 'SEED_ADMIN_PASSWORD' : 'SEED_OWNER_PASSWORD']);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
async function navigate(page, label) {
  const menu = page.getByRole('button', { name: 'Buka menu' });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator('.sidebar nav')
    .getByRole('button', { name: new RegExp('^' + label + '(?: [0-9]+)?$') })
    .click();
}
test('admin dashboard and order creation work with server persistence', async ({
  page,
}, testInfo) => {
  await login(page, 'admin');
  await expect(page.locator('.stat-card')).toHaveCount(4);
  await expect(page.locator('.recent-orders tbody tr').first()).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/admin-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await navigate(page, 'Pesanan');
  await page.getByRole('button', { name: 'Catat pesanan' }).click();
  const customerName = 'E2E ' + testInfo.project.name + ' ' + randomBytes(4).toString('hex');
  testInfo.annotations.push({ type: 'test-customer', description: customerName });
  await page.getByLabel('Nama pelanggan').fill(customerName);
  await page.getByLabel('Nomor telepon').fill('081234567899');
  const select = page.getByRole('combobox', { name: 'Produk 1' });
  const productId = await select
    .locator('option')
    .filter({ hasText: 'Rosy Reverie' })
    .getAttribute('value');
  await select.selectOption(productId);
  await page.getByRole('spinbutton', { name: 'Jumlah 1' }).fill('2');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('tr').filter({ hasText: customerName })).toContainText('570.000');
  const row = page.locator('tr').filter({ hasText: customerName });
  await row.getByRole('button', { name: /Hapus BV-/ }).click();
  await page.getByRole('button', { name: 'Hapus pesanan', exact: true }).click();
  await expect(row).toHaveCount(0);
  await navigate(page, 'Produk');
  await expect(page.getByRole('button', { name: 'Tambah produk' })).toBeVisible();
  await navigate(page, 'Rekomendasi');
  await expect(page.getByRole('button', { name: 'Tambah rekomendasi' })).toBeVisible();
});
test('owner has read-only orders and can download filtered PDF', async ({ page }, testInfo) => {
  await login(page, 'owner');
  await navigate(page, 'Daftar pesanan');
  await expect(page.getByRole('button', { name: 'Catat pesanan' })).toHaveCount(0);
  await expect(
    page.locator('.sidebar nav').getByRole('button', { name: 'Produk', exact: true }),
  ).toHaveCount(0);
  await navigate(page, 'Riwayat & laporan');
  await expect(page.getByRole('heading', { name: 'Riwayat penjualan' })).toBeVisible();
  await page.getByLabel('Dari tanggal').fill('2026-01-01');
  await page.getByLabel('Sampai tanggal').fill('2027-01-01');
  await page.getByRole('button', { name: 'Tampilkan', exact: true }).click();
  await expect(page.locator('.report-summary')).toContainText('2027');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('bien-vendre-2026-01-01-2027-01-01.pdf');
  expect(await download.failure()).toBeNull();
  await page.screenshot({
    path: `docs/screenshots/owner-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page
    .getByRole('button', { name: 'Buka menu' })
    .isVisible()
    .then(async (visible) => {
      if (visible) await page.getByRole('button', { name: 'Buka menu' }).click();
    });
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Login tim' })).toBeVisible();
});
