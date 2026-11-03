import { test, expect } from '@playwright/test';

test('compact home shows grouped collections, complete photos and working collection links', async ({
  page,
}) => {
  let topWedding;
  await page.route('**/api/products?**', async (route) => {
    const response = await route.fetch();
    const products = await response.json();
    const candidate = products.find((p) => p.name === 'Bouquet Wedding Baby’s Breath');
    if (candidate) topWedding = candidate.name;
    await route.fulfill({
      response,
      json: products.map((p) => ({ ...p, sold_count: p.name === topWedding ? 99 : 0 })),
    });
  });
  await page.goto('/catalog');
  await expect(page.locator('.home-product-group')).toHaveCount(4);
  await expect(page.locator('.home-single')).toHaveCount(6);
  const wedding = page.locator('.home-product-group').first();
  await expect(wedding.locator('.rank-1 h3')).toHaveText('Bouquet Wedding Baby’s Breath');
  await expect(wedding.locator('.product-rank').first()).toContainText('Terlaris');
  const largest = await wedding.locator('.rank-1').boundingBox();
  const second = await wedding.locator('.rank-2').boundingBox();
  const third = await wedding.locator('.rank-3').boundingBox();
  expect(largest.height).toBeGreaterThan(second.height);
  expect(Math.abs(second.height - third.height)).toBeLessThan(2);
  const images = page.locator('.home-group-products .product-picture img');
  await expect(images).toHaveCount(12);
  expect(await images.first().evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Lihat koleksi Wedding', exact: true }).click();
  await expect(page.locator('.home-curation')).toHaveCount(0);
  const collapsed = page.locator('.catalog-filter-panel:not([open]) > summary');
  if (await collapsed.isVisible()) await collapsed.click();
  await expect(
    page.locator('.catalog-sidebar').getByRole('button', { name: /Wedding/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.nav-links').getByRole('link', { name: 'Beranda', exact: true }).click();
  await page
    .locator('.home-single')
    .filter({ hasText: 'Snack' })
    .first()
    .getByRole('button', { name: 'Snack', exact: true })
    .click();
  if (await collapsed.isVisible()) await collapsed.click();
  await expect(
    page.locator('.catalog-sidebar').getByRole('button', { name: 'Snack', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('header links home, the filterable full collection and about', async ({ page }) => {
  await page.goto('/catalog');
  const nav = page.locator('.nav-links');
  await expect(nav.getByRole('link')).toHaveText(['Beranda', 'Koleksi bunga', 'Tentang kami']);
  await nav.getByRole('link', { name: 'Koleksi bunga', exact: true }).click();
  await expect(page.locator('.catalog-sidebar')).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(9);
  await page.reload();
  await expect(page.locator('.catalog-sidebar')).toBeVisible();
  await nav.getByRole('link', { name: 'Tentang kami', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await nav.getByRole('link', { name: 'Beranda', exact: true }).click();
  await expect(page.locator('.home-product-group')).toHaveCount(4);
});
