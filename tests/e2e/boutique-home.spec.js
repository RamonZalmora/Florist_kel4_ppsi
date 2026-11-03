import { test, expect } from '@playwright/test';

test('compact home shows grouped collections, complete photos and working collection links', async ({
  page,
}) => {
  await page.goto('/catalog');
  await expect(page.locator('.home-product-group')).toHaveCount(4);
  await expect(page.locator('.home-single')).toHaveCount(6);
  const images = page.locator('.home-group-products .product-picture img');
  await expect(images).toHaveCount(16);
  expect(await images.first().evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Lihat koleksi Wedding', exact: true }).click();
  await expect(page.locator('.home-curation')).toHaveCount(0);
  const collapsed = page.locator('.catalog-filter-panel:not([open]) > summary');
  if (await collapsed.isVisible()) await collapsed.click();
  await expect(
    page.locator('.catalog-sidebar').getByRole('button', { name: /Wedding/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Koleksi bunga', exact: true }).click();
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
