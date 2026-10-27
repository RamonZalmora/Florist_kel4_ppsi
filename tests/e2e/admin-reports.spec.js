import 'dotenv/config';
import { test, expect } from '@playwright/test';

test('admin views sales history and downloads a PDF', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Buka menu' });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator('.sidebar nav')
    .getByRole('button', { name: 'Riwayat & laporan', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Riwayat penjualan' })).toBeVisible();
  await page.getByLabel('Dari tanggal').fill('2020-01-01');
  await page.getByLabel('Sampai tanggal').fill('2030-01-01');
  await page.getByRole('button', { name: 'Tampilkan', exact: true }).click();
  await expect(page.locator('.report-summary')).toContainText('2030');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('bien-vendre-2020-01-01-2030-01-01.pdf');
  expect(await download.failure()).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
