import { test, expect } from '@playwright/test';

test('new shop products can be found and ordered with the listed price', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('link', { name: 'Koleksi bunga', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cari produk' }).fill('Frame Mahar Bunga Biru');
  const card = page.locator('.product-card');
  await expect(card).toHaveCount(1);
  await expect(card.locator('h3')).toHaveText('Frame Mahar Bunga Biru');
  await expect(card.locator('.product-price')).toContainText('461.500');
  const picture = card.locator('img');
  await expect(picture).toBeVisible();
  await expect
    .poll(() => picture.evaluate((img) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  const link = card.getByRole('link', { name: /Pesan Frame Mahar Bunga Biru via WhatsApp/ });
  const url = new URL(await link.getAttribute('href'));
  expect(url.pathname).toBe('/6282380087007');
  expect(url.searchParams.get('text')).toContain('Frame Mahar Bunga Biru');
  await card.locator('.product-picture').click();
  await expect(page.getByText(/Gambar merupakan ilustrasi/)).toBeVisible();
});
