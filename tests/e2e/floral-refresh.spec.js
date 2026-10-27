import { test, expect } from '@playwright/test';

test('floating channels stay on screen and use store links', async ({ page }) => {
  await page.route('**/api/store', (route) =>
    route.fulfill({
      json: {
        name: 'Florist',
        address: '',
        description: '',
        logo: '',
        whatsapp: '6281234567890',
        instagram: 'https://www.instagram.com/florist/',
        tiktok: 'https://www.tiktok.com/@florist',
      },
    }),
  );
  await page.goto('/catalog');
  const dock = page.locator('.floating-social');
  await expect(dock.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
    'href',
    'https://wa.me/6281234567890',
  );
  await expect(dock.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
    'href',
    'https://www.instagram.com/florist/',
  );
  await expect(dock.getByRole('link', { name: 'TikTok' })).toHaveAttribute(
    'href',
    'https://www.tiktok.com/@florist',
  );
  const before = await dock.boundingBox();
  await page.evaluate(() => window.scrollTo(0, 900));
  const after = await dock.boundingBox();
  expect(Math.abs(before.y - after.y)).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('admin orders show two statuses and can complete directly', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Buka menu' });
  if (await menu.isVisible()) await menu.click();
  await page.locator('.sidebar nav').getByRole('button', { name: 'Pesanan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Belum selesai', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selesai', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Diproses', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Belum selesai', exact: true }).click();
  await page
    .getByRole('button', { name: /^Status BV-/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Selesaikan & catat penjualan' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mulai proses' })).toHaveCount(0);
});
