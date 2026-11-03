import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

for (const role of ['admin', 'owner']) {
  test(`${role} dashboard renders actual favorites and accessible sales chart`, async ({
    page,
  }) => {
    const products = await (await page.request.get('/api/products')).json();
    const product = products[0];
    const visitor = randomUUID();
    const favoritePath = '/api/favorites/' + product.id;
    try {
      expect(
        (await page.request.put(favoritePath, { data: { visitor, favorite: true } })).ok(),
      ).toBe(true);
      await page.goto('/login');
      await page.getByLabel('Username', { exact: true }).fill(role);
      await page
        .getByLabel('Password', { exact: true })
        .fill(process.env[role === 'admin' ? 'SEED_ADMIN_PASSWORD' : 'SEED_OWNER_PASSWORD']);
      await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
      const dashboard = await (await page.request.get('/api/dashboard')).json();
      const expected = dashboard.popular.reduce(
        (total, item) => total + Number(item.favorite_count),
        0,
      );
      await expect(page.locator('.favorite-ring strong')).toHaveText(String(expected));
      await expect(page.locator('.favorite-ring')).toHaveAttribute(
        'aria-label',
        /favorit pada empat produk teratas/,
      );
      await expect(page.getByRole('img', { name: /Penjualan tujuh hari terakhir/ })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    } finally {
      await page.request.put(favoritePath, { data: { visitor, favorite: false } });
    }
  });
}
