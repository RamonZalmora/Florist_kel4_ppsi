import { test, expect } from '@playwright/test';

test('admin manages types and assigns a typed product to an occasion without recommendation navigation', async ({
  page,
}, info) => {
  const marker = 'Jenis ' + info.project.name + ' ' + Date.now();
  let typeId, productId;
  try {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
    await expect(page.locator('.stat-grid')).toBeVisible();
    async function go(name) {
      const menu = page.getByRole('button', { name: 'Buka menu' });
      if (await menu.isVisible()) await menu.click();
      await page.locator('.sidebar nav').getByRole('button', { name, exact: true }).click();
    }
    await expect(
      page.locator('.sidebar nav').getByRole('button', { name: 'Rekomendasi', exact: true }),
    ).toHaveCount(0);
    await go('Kategori');
    await expect(page.locator('.page-heading')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Occasion', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tambah jenis', exact: true }).click();
    await page.getByLabel('Nama jenis').fill(marker);
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    typeId = (await (await page.request.get('/api/product-types')).json()).find(
      (t) => t.name === marker,
    ).id;
    await go('Produk');
    await page.getByRole('button', { name: 'Tambah produk' }).click();
    await page.getByLabel('Nama produk').fill(marker + ' buket');
    await page.getByLabel('Harga (Rp)').fill('55000');
    await page.getByLabel('Ukuran', { exact: true }).fill('M');
    await page.getByLabel('Bahan / rincian produk').fill('Bunga artificial');
    await page.getByLabel('Jenis produk', { exact: true }).selectOption(String(typeId));
    await page.getByLabel('Deskripsi', { exact: true }).fill('Pengujian jenis produk');
    await page.getByRole('checkbox', { name: 'Wisuda', exact: true }).check();
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    productId = (await (await page.request.get('/api/manage/products')).json()).find(
      (p) => p.name === marker + ' buket',
    ).id;
    await page
      .locator('.occasion-product-tabs')
      .getByRole('button', { name: 'Wisuda', exact: true })
      .click();
    await expect(page.locator('tr').filter({ hasText: marker + ' buket' })).toBeVisible();
    const filtered = await (await page.request.get('/api/products?type_id=' + typeId)).json();
    expect(filtered.map((p) => p.id)).toContain(productId);
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
