import 'dotenv/config';
import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
async function login(page, role) {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(role);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env[role === 'admin' ? 'SEED_ADMIN_PASSWORD' : 'SEED_OWNER_PASSWORD']);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
async function go(page, label) {
  const menu = page.getByRole('button', { name: 'Buka menu' });
  if (await menu.isVisible()) await menu.click();
  await page.locator('.sidebar nav').getByRole('button', { name: label, exact: true }).click();
}
test('admin can upload a real photo into the product form; store settings form is available', async ({
  page,
}) => {
  let photo, id;
  const name = 'Upload ' + randomBytes(5).toString('hex');
  await login(page, 'admin');
  try {
    await go(page, 'Pengaturan');
    await expect(page.getByRole('button', { name: 'Simpan pengaturan toko' })).toBeVisible();
    await expect(page.getByLabel('WhatsApp konsultasi')).toBeVisible();
    await go(page, 'Produk');
    await page.getByRole('button', { name: 'Tambah produk' }).click();
    await page.getByLabel('Nama produk').fill(name);
    await page.getByLabel('Harga (Rp)').fill('220000');
    await page.getByLabel('Ukuran', { exact: true }).fill('Medium');
    await page.getByLabel('Jenis bunga').fill('Mawar');
    await page.getByLabel('Deskripsi', { exact: true }).fill('Fixture upload');
    const image = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#dcb8aa' },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel('Upload foto produk')
      .setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: image });
    await expect(page.getByLabel('URL foto', { exact: true })).toHaveValue(/^\/uploads\/.+\.webp$/);
    photo = await page.getByLabel('URL foto', { exact: true }).inputValue();
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('tr').filter({ hasText: name })).toBeVisible();
    const products = await (await page.context().request.get('/api/manage/products')).json();
    const product = products.find((p) => p.name === name);
    id = product.id;
    expect(product.photo).toBe(photo);
  } finally {
    const client = page.context().request;
    const me = await (await client.get('/api/auth/me')).json();
    if (!id) {
      const products = await (await client.get('/api/manage/products')).json();
      id = products.find((p) => p.name === name)?.id;
    }
    if (id)
      expect(
        (
          await client.delete('/api/manage/products/' + id, {
            headers: { 'X-CSRF-Token': me.csrf_token },
          })
        ).ok(),
      ).toBeTruthy();
    if (photo) {
      expect(photo).toMatch(/^\/uploads\/[a-f0-9-]{36}\.webp$/);
      await unlink(new URL('../../.local' + photo, import.meta.url));
    }
  }
});
test('owner has four customer cards, a report chart, and no store edit permission', async ({
  page,
}) => {
  await login(page, 'owner');
  await go(page, 'Pelanggan');
  await expect(page.locator('.stat-card')).toHaveCount(4);
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await go(page, 'Riwayat & laporan');
  await expect(page.getByRole('heading', { name: 'Tren penjualan periode' })).toBeVisible();
  await go(page, 'Pengaturan');
  await expect(page.getByRole('button', { name: 'Simpan pengaturan toko' })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
test('public order tracking requires an unguessable code and reveals only status and dates', async ({
  page,
}) => {
  await login(page, 'admin');
  const orders = await (await page.context().request.get('/api/orders')).json();
  const code = orders[0].tracking_code;
  await page.context().clearCookies();
  await page.goto('/catalog');
  await page.getByLabel('Kode pelacakan', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Lacak pesanan', exact: true }).click();
  await expect(page.locator('.tracking-result')).toContainText('BV-');
  await expect(page.locator('.tracking-result')).not.toContainText(orders[0].phone_number);
  await page.getByLabel('Kode pelacakan', { exact: true }).fill('0'.repeat(32));
  await page.getByRole('button', { name: 'Lacak pesanan', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('tidak ditemukan');
  await page.getByLabel('Harga minimum', { exact: true }).fill('200000');
  await page.getByRole('combobox', { name: 'Anggaran', exact: true }).selectOption('350000');
  await expect(page.locator('.product-card')).toHaveCount(2);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
