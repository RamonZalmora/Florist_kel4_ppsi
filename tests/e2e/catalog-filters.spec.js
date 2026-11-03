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
  await filters.getByRole('button', { name: /Hemat/ }).click();
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
  await expect(filters.getByRole('button', { name: /Hemat/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
