import 'dotenv/config';
import { test, expect } from '@playwright/test';

test('admin manages types and assigns a typed product to an occasion without recommendation navigation', async ({
  page,
}, info) => {
  const marker = 'Jenis ' + info.project.name + ' ' + Date.now();
  async function capture(name) {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((image) => {
          image.loading = 'eager';
          return image.decode();
        }),
      );
    });
    await page.screenshot({
      path: 'docs/screenshots/' + name + '-' + info.project.name + '.png',
      fullPage: true,
    });
  }
  let typeId, productId;
  try {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
    await expect(page.locator('.sales-stats')).toBeVisible();
    async function go(name) {
      const menu = page.getByRole('button', { name: 'Buka menu' });
      if (await menu.isVisible()) await menu.click();
      await page.locator('.sidebar nav').getByRole('button', { name, exact: true }).click();
    }
    await expect(
      page.locator('.sidebar nav').getByRole('button', { name: 'Rekomendasi', exact: true }),
    ).toHaveCount(0);
    await go('Kategori');
    await expect(
      page.locator('.topbar').getByRole('tablist', { name: 'Kelompok kategori' }),
    ).toBeVisible();
    await expect(page.locator('.workspace-content .classification-command')).toHaveCount(0);
    await expect(page.locator('.page-heading')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Occasion', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Occasion/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await capture('classifications-occasion');
    await page.getByRole('tab', { name: /Jenis produk/ }).click();
    await expect(page.getByRole('heading', { name: 'Jenis produk', exact: true })).toBeVisible();
    await capture('classifications-types');
    await page.getByRole('button', { name: 'Tambah jenis', exact: true }).click();
    await expect(page.getByLabel('Upload foto jenis produk')).toHaveAttribute('type', 'file');
    await page.getByLabel('Nama jenis').fill(marker);
    await capture('classification-editor');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    typeId = (await (await page.request.get('/api/product-types')).json()).find(
      (t) => t.name === marker,
    ).id;
    await expect(page.locator('.classification-card').filter({ hasText: marker })).toBeVisible();
    await go('Produk');
    await page.getByRole('button', { name: 'Tambah produk' }).click();
    await page.getByLabel('Nama produk').fill(marker + ' buket');
    await page.getByLabel('Harga (Rp)').fill('55000');
    await page.getByLabel('Ukuran', { exact: true }).fill('M');
    await page.getByLabel('Bahan / rincian produk').fill('Bunga artificial');
    await page.getByLabel('Jenis produk', { exact: true }).selectOption(String(typeId));
    await page.getByLabel('Deskripsi', { exact: true }).fill('Pengujian jenis produk');
    await page.getByRole('checkbox', { name: 'Wisuda', exact: true }).check();
    await capture('product-editor-modern');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    productId = (await (await page.request.get('/api/manage/products')).json()).find(
      (p) => p.name === marker + ' buket',
    ).id;
    const occasions = await (await page.request.get('/api/categories')).json();
    await page
      .getByLabel('Filter occasion')
      .selectOption(String(occasions.find((entry) => entry.name === 'Wisuda').id));
    await expect(page.locator('tr').filter({ hasText: marker + ' buket' })).toBeVisible();
    const filtered = await (await page.request.get('/api/products?type_id=' + typeId)).json();
    expect(filtered.map((p) => p.id)).toContain(productId);
    await go('Kategori');
    await page.getByRole('tab', { name: /Jenis produk/ }).click();
    await page
      .locator('.classification-card')
      .filter({ has: page.getByRole('heading', { name: marker, exact: true }) })
      .getByRole('button', { name: 'Lihat produk' })
      .click();
    await expect(page.locator('.product-type-context')).toContainText(marker);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toContainText(marker + ' buket');
  } finally {
    const me = await page.request.get('/api/auth/me');
    if (me.ok()) {
      const headers = { 'X-CSRF-Token': (await me.json()).csrf_token };
      if (productId) {
        const links = await (await page.request.get('/api/manage/recommendations')).json();
        for (const r of links.filter((r) => String(r.product_id) === String(productId)))
          await page.request.delete('/api/manage/recommendations/' + r.id, { headers });
        await page.request.delete('/api/manage/products/' + productId, { headers });
      }
      if (typeId) await page.request.delete('/api/manage/product-types/' + typeId, { headers });
    }
  }
});
