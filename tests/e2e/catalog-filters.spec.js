import { test, expect } from '@playwright/test';

test('occasion, product type and budget filters combine and reset on desktop and mobile', async ({
  page,
}, info) => {
  await page.goto('/catalog');
  await expect(page.locator('.moment-list').getByRole('button', { name: /Wedding/ })).toBeVisible();
  await page
    .locator('.moment-list')
    .getByRole('button', { name: /Wisuda/ })
    .click();
  const filters = page.locator('.catalog-sidebar');
  if (info.project.name === 'mobile') await filters.locator('summary').click();
  await expect(filters.getByRole('button', { name: /Wisuda/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await filters.getByRole('button', { name: 'Boneka', exact: true }).click();
  await filters.getByRole('spinbutton', { name: 'Harga minimum (Rp)', exact: true }).fill('10000');
  await filters
    .getByRole('spinbutton', { name: 'Harga maksimum (Rp)', exact: true })
    .fill('99999.99');
  await expect(page.locator('.catalog-result-bar')).toContainText('produk ditemukan');
  await expect(page.locator('.product-card').first()).toBeVisible();
  const products = await (
    await page.request.get('/api/products?type=boneka&max_price=99999.99')
  ).json();
  expect(products.length).toBeGreaterThan(0);
  expect(products.every((p) => Number(p.price) < 100000)).toBe(true);
  await filters.getByRole('button', { name: 'Reset filter' }).click();
  await expect(filters.getByRole('button', { name: 'Boneka', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(
    filters.getByRole('spinbutton', { name: 'Harga minimum (Rp)', exact: true }),
  ).toHaveValue('');
  await expect(
    filters.getByRole('spinbutton', { name: 'Harga maksimum (Rp)', exact: true }),
  ).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('collection expands inline and can be collapsed without losing the original products', async ({
  page,
}) => {
  await page.goto('/catalog?view=collection');
  await expect(page.locator('.product-grid .product-card')).toHaveCount(8);
  const first = await page.locator('.product-grid .product-card').first().textContent();
  await page.getByRole('button', { name: 'Lihat lebih banyak', exact: true }).click();
  await expect(page.locator('.product-grid .product-card')).toHaveCount(16);
  await expect(page.locator('.product-grid .product-card').first()).toHaveText(first);
  await page.getByRole('button', { name: 'Tampilkan lebih sedikit', exact: true }).click();
  await expect(page.locator('.product-grid .product-card')).toHaveCount(8);
  await expect(
    page.getByRole('button', { name: 'Tampilkan lebih sedikit', exact: true }),
  ).toHaveCount(0);
});
