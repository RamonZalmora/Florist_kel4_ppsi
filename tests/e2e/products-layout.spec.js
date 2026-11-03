import 'dotenv/config';
import { test, expect } from '@playwright/test';

test('products show five sellers, seven rows per page, and combined occasion/type filters', async ({
  page,
}, info) => {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page.locator('.sales-stats')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Buka menu' });
  if (await menu.isVisible()) await menu.click();
  await page.locator('.sidebar nav').getByRole('button', { name: 'Produk', exact: true }).click();
  const products = await (await page.request.get('/api/manage/products')).json();
  const recommendations = await (await page.request.get('/api/manage/recommendations')).json();
  const dashboard = await (await page.request.get('/api/dashboard')).json();
  const rows = page.locator('.catalog-management-table tbody tr');
  await expect(rows).toHaveCount(Math.min(7, products.length));
  await expect(page.locator('.catalog-management-table th')).toHaveCount(4);
  const sellers = [...dashboard.popular]
    .sort(
      (a, b) =>
        Number(b.completed_order_count) - Number(a.completed_order_count) ||
        Number(b.sold_count) - Number(a.sold_count),
    )
    .slice(0, 5);
  await expect(page.locator('.product-seller-card')).toHaveCount(sellers.length);
  for (let i = 0; i < sellers.length; i++) {
    await expect(page.locator('.product-seller-card').nth(i)).toHaveAttribute(
      'data-product-id',
      String(sellers[i].id),
    );
    await expect(page.locator('.product-seller-card').nth(i)).toContainText(
      sellers[i].completed_order_count + ' pesanan selesai',
    );
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) => {
        image.loading = 'eager';
        return image.decode();
      }),
    );
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'docs/screenshots/products-modern-' + info.project.name + '.png',
    fullPage: true,
  });
  if (products.length > 7) {
    await page.getByRole('button', { name: 'Halaman berikutnya' }).click();
    await expect(rows.first()).toHaveAttribute('data-product-id', String(products[7].id));
  }
  const candidate = products.find(
    (product) =>
      product.product_type_id &&
      recommendations.some((link) => String(link.product_id) === String(product.id)),
  );
  if (candidate) {
    const categoryId = recommendations.find(
      (link) => String(link.product_id) === String(candidate.id),
    ).category_id;
    await page.getByLabel('Filter occasion', { exact: true }).selectOption(String(categoryId));
    await page
      .getByLabel('Filter jenis produk', { exact: true })
      .selectOption(String(candidate.product_type_id));
    const filtered = products.filter(
      (product) =>
        String(product.product_type_id) === String(candidate.product_type_id) &&
        recommendations.some(
          (link) =>
            String(link.product_id) === String(product.id) &&
            String(link.category_id) === String(categoryId),
        ),
    );
    await expect(rows).toHaveCount(Math.min(7, filtered.length));
    for (let i = 0; i < Math.min(7, filtered.length); i++)
      await expect(rows.nth(i)).toHaveAttribute('data-product-id', String(filtered[i].id));
    await page.getByLabel('Cari produk', { exact: true }).fill(candidate.name);
    await expect(rows).toHaveCount(
      filtered.filter((product) =>
        (product.name + ' ' + product.flower_type)
          .toLowerCase()
          .includes(candidate.name.toLowerCase()),
      ).length,
    );
  }
  await page
    .getByLabel('Cari produk', { exact: true })
    .fill('No product matches this phrase 987654321');
  await expect(rows).toHaveCount(0);
  await page
    .locator('.product-filter-heading')
    .getByRole('button', { name: 'Reset', exact: true })
    .click();
  await expect(rows).toHaveCount(Math.min(7, products.length));
  await expect(page.getByLabel('Cari produk', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Halaman sebelumnya' })).toBeDisabled();
});
