import { test, expect } from '@playwright/test';

test('home groups products by occasion and catalog supports paging and sorting', async ({
  page,
}) => {
  await page.goto('/catalog');
  await expect(page.locator('.home-product-group')).toHaveCount(4);
  for (const group of await page.locator('.home-product-group').all())
    await expect(group.locator('.product-card')).toHaveCount(4);
  await page.getByRole('link', { name: 'Koleksi bunga', exact: true }).click();
  const collapsedFilters = page.locator('.catalog-filter-panel:not([open]) > summary');
  if (await collapsedFilters.isVisible()) await collapsedFilters.click();
  await expect(page.locator('.product-card')).toHaveCount(9);
  await expect(page.getByLabel('Urutkan')).toHaveValue('newest');
  const first = await page.locator('.product-card h3').first().textContent();
  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect(page.locator('.pagination button[aria-current="page"]')).toHaveText('2');
  await expect(page.locator('.product-card h3').first()).not.toHaveText(first);
  await page.getByLabel('Urutkan').selectOption('popular');
  await expect(page.locator('.pagination button[aria-current="page"]')).toHaveText('1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('only owner can change store profile and neither role sees delivery agenda', async ({
  page,
}) => {
  async function login(role, password) {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill(role);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  }
  async function settings() {
    const menu = page.getByRole('button', { name: 'Buka menu' });
    if (await menu.isVisible()) await menu.click();
    await page
      .locator('.sidebar nav')
      .getByRole('button', { name: 'Pengaturan', exact: true })
      .click();
  }
  await login('admin', 'AdminTestPass123');
  await expect(page.getByText('Agenda pengiriman')).toHaveCount(0);
  await settings();
  await expect(page.getByRole('button', { name: 'Simpan pengaturan toko' })).toHaveCount(0);
  const menu = page.getByRole('button', { name: 'Buka menu' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await login('owner', 'OwnerTestPass123');
  await expect(page.getByText('Agenda pengiriman')).toHaveCount(0);
  await settings();
  await expect(page.getByRole('button', { name: 'Simpan pengaturan toko' })).toBeVisible();
  await expect(page.getByLabel('Cerita toko di Tentang Kami')).toBeVisible();
  await expect(page.getByLabel('Layanan di Tentang Kami')).toBeVisible();
  await expect(page.getByLabel('Tips perawatan bunga')).toBeVisible();
});
