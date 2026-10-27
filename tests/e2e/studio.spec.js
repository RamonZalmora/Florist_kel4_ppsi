import 'dotenv/config';
import { test, expect } from '@playwright/test';
async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('owner');
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_OWNER_PASSWORD);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
async function go(page, label) {
  const menu = page.getByRole('button', { name: 'Buka menu' });
  if (await menu.isVisible()) await menu.click();
  await page.locator('.sidebar nav').getByRole('button', { name: label, exact: true }).click();
}
test('owner can inspect data, export JSON and open a delivery agenda', async ({ page }, info) => {
  await login(page);
  await go(page, 'Data bisnis');
  await expect(page.getByRole('heading', { name: 'Data bisnis', exact: true })).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await page.getByLabel('Konfirmasi password owner').fill(process.env.SEED_OWNER_PASSWORD);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh JSON' }).click();
  const file = await downloadPromise;
  expect(file.suggestedFilename()).toMatch(/bien-vendre-data-.*\.json/);
  expect(await file.failure()).toBeNull();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: `docs/screenshots/data-${info.project.name}.png`, fullPage: true });
  const orders = await (await page.context().request.get('/api/orders')).json();
  const order = orders.find((o) => ['pending', 'processing'].includes(o.status));
  await go(page, 'Agenda pengiriman');
  await page.getByLabel('Tanggal pengiriman').fill(order.delivery_date.slice(0, 10));
  await expect(page.locator('.agenda-card').first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await go(page, 'Pengaturan');
  await expect(page.getByRole('heading', { name: 'Keamanan & pemulihan akun' })).toBeVisible();
});
test('forgot-password screen explains unavailable email and invalid reset links fail safely', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Lupa password?' }).click();
  await expect(page.getByRole('heading', { name: 'Kembali ke ruang Anda.' })).toBeVisible();
  await expect(
    page.getByText('Pemulihan email belum diaktifkan. Hubungi owner toko untuk bantuan.'),
  ).toBeVisible();
  await page.goto('/reset-password#token=' + 'a'.repeat(64));
  await expect(page.getByRole('heading', { name: 'Mulai dengan password baru.' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await page.getByLabel('Password baru', { exact: true }).fill('Example-Password-1234');
  await page.getByLabel('Ulangi password').fill('Example-Password-1234');
  await page.getByRole('button', { name: 'Simpan password baru' }).click();
  await expect(page.getByRole('alert')).toContainText('Tautan sudah digunakan atau kedaluwarsa.');
});

test('customer can combine a budget and price order', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page.locator('.product-card')).toHaveCount(6);
  await page.getByLabel('Anggaran', { exact: true }).selectOption('200000');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByLabel('Urutkan', { exact: true }).selectOption('price_asc');
  await expect(page.locator('.product-card').first()).toContainText('Memories Frame');
  await page.getByLabel('Anggaran', { exact: true }).selectOption('');
  await expect(page.locator('.product-card')).toHaveCount(6);
});
