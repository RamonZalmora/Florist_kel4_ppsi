import 'dotenv/config';
import { test, expect } from '@playwright/test';
for (const role of ['admin', 'owner']) {
  test(`${role} dashboard ranks completed sales and supports category filtering`, async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill(role);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env[role === 'admin' ? 'SEED_ADMIN_PASSWORD' : 'SEED_OWNER_PASSWORD']);
    await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
    await expect(page.locator('.stat-grid')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toHaveCount(0);
    const dashboard = await (await page.request.get('/api/dashboard')).json();
    const expected = dashboard.popular.slice(0, 4).reduce((n, p) => n + Number(p.sold_count), 0);
    await expect(page.locator('.favorite-ring strong')).toHaveText(String(expected));
    await expect(page.getByRole('img', { name: /Penjualan tujuh hari terakhir/ })).toBeVisible();
    const categories = await (await page.request.get('/api/categories')).json();
    const category = categories.find((c) =>
      dashboard.popular.some((p) => p.categories.some((k) => String(k.id) === String(c.id))),
    );
    if (category) {
      await page.getByLabel('Kategori produk terlaris').selectOption(String(category.id));
      const total = dashboard.popular
        .filter((p) => p.categories.some((c) => String(c.id) === String(category.id)))
        .slice(0, 4)
        .reduce((n, p) => n + Number(p.sold_count), 0);
      await expect(page.locator('.favorite-ring strong')).toHaveText(String(total));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
