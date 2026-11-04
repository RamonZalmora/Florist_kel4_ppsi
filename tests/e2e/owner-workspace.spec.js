import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function login(page, role = 'owner') {
  await page.route('https://maps.google.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body>Map preview</body></html>' }),
  );
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill(role);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env[role === 'owner' ? 'SEED_OWNER_PASSWORD' : 'SEED_ADMIN_PASSWORD']);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page.locator('.sales-stats')).toBeVisible();
}
async function go(page, name) {
  const menu = page.getByRole('button', { name: 'Buka menu' });
  if (await menu.isVisible()) await menu.click();
  await page.locator('.sidebar nav').getByRole('button', { name, exact: true }).click();
}
async function screenshot(page, path) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return document.fonts.ready;
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
}
test('owner settings save stories and location to the public About page', async ({
  page,
}, info) => {
  await login(page);
  const original = await (await page.request.get('/api/store')).json();
  const me = await (await page.request.get('/api/auth/me')).json();
  try {
    await go(page, 'Pengaturan');
    await expect(page.getByRole('heading', { name: 'Identitas toko' })).toBeVisible();
    await screenshot(page, `docs/screenshots/owner-settings-${info.project.name}.png`);
    await page.getByRole('tab', { name: 'Tentang Kami', exact: true }).click();
    await page.getByLabel('Cerita toko di Tentang Kami').fill('Rangkaian penuh cerita dari owner.');
    await page.getByRole('tab', { name: 'Lokasi toko', exact: true }).click();
    await page.getByLabel('Alamat toko', { exact: true }).fill('Jl. Melati, Pekanbaru, Riau');
    await page.getByLabel('Latitude (lintang)').fill('0.5071');
    await page.getByLabel('Longitude (bujur)').fill('101.4478');
    await expect(page.getByTitle('Pratinjau titik lokasi toko')).toHaveAttribute(
      'src',
      /q=0.5071,101.4478/,
    );
    const saved = page.waitForResponse(
      (r) => r.url().endsWith('/api/store') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Simpan pengaturan toko' }).click();
    expect((await saved).ok()).toBe(true);
    await expect(page.locator('.store-save-bar')).toContainText('Profil toko tersimpan');
    await screenshot(page, `docs/screenshots/owner-location-${info.project.name}.png`);
    await page.goto('/about');
    await expect(
      page.getByText('Rangkaian penuh cerita dari owner.', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Konsultasi buket untuk momen spesial.', { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText('Ganti air bersih setiap hari.', { exact: true })).toHaveCount(0);
    await expect(page.locator('.location-address')).toContainText('Jl. Melati, Pekanbaru, Riau');
    await expect(page.getByTitle('Peta lokasi Bien Vendre')).toHaveAttribute(
      'src',
      /q=0.5071,101.4478/,
    );
    await expect(page.getByRole('link', { name: 'Buka Google Maps', exact: true })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=0.5071,101.4478',
    );
    await page.reload();
    await expect(page.locator('.location-address')).toContainText('Jl. Melati, Pekanbaru, Riau');
  } catch (error) {
    console.error('Owner settings flow:', error.message);
    throw error;
  } finally {
    const restored = await page.request.put('/api/store', {
      headers: { 'X-CSRF-Token': me.csrf_token },
      data: original,
    });
    expect(restored.ok()).toBe(true);
  }
});
test('business data supports search, pages, detail and full JSON export', async ({
  page,
}, info) => {
  await login(page);
  await go(page, 'Data bisnis');
  const workspace = page.locator('.business-workspace');
  await expect(workspace).toHaveAttribute('aria-busy', 'false');
  const rows = page.locator('.business-data-table tbody tr');
  const result = await (await page.request.get('/api/data/products?limit=10')).json();
  await expect(rows).toHaveCount(Math.min(10, result.total));
  if (result.total > 10) {
    await page.getByRole('button', { name: 'Halaman 2', exact: true }).click();
    await expect(page.locator('.business-pagination button[aria-current=page]')).toHaveText('2');
    await expect(rows.first().locator('td').first()).toHaveText('11');
  }
  await page.getByLabel('Cari data bisnis').fill('no-match-987654321');
  await expect(rows).toHaveCount(0);
  await page.getByLabel('Cari data bisnis').fill('');
  await expect(rows).toHaveCount(Math.min(10, result.total));
  await rows
    .first()
    .getByRole('button', { name: /Detail data/ })
    .click();
  await expect(page.getByRole('region', { name: 'Detail data terpilih' })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup detail data' }).click();
  await page
    .locator('.business-nav')
    .getByRole('button', { name: /Penjualan/ })
    .click();
  await expect(workspace).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.business-table-heading h2')).toContainText('Penjualan');
  await screenshot(page, `docs/screenshots/owner-business-${info.project.name}.png`);
  await page.locator('.business-export summary').click();
  await page.getByLabel('Konfirmasi password owner').fill(process.env.SEED_OWNER_PASSWORD);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh JSON', exact: true }).click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  const value = JSON.parse(await readFile(await file.path(), 'utf8'));
  expect(value.data.products.length).toBe(result.total);
  expect(Array.isArray(value.data.store_settings)).toBe(true);
  if (value.data.store_settings.length)
    expect(value.data.store_settings[0]).toHaveProperty('latitude');
  expect(value.data).not.toHaveProperty('users');
});
test('admin settings show account security without owner controls', async ({ page }) => {
  await login(page, 'admin');
  await go(page, 'Pengaturan');
  await expect(page.getByRole('heading', { name: 'Keamanan & pemulihan akun' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Pengaturan toko', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Simpan pengaturan toko' })).toHaveCount(0);
});
