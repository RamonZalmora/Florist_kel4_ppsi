import { test, expect } from '@playwright/test';

test('admin adds and changes occasions directly in the product form', async ({ page }, info) => {
  const name = `Tes Occasion ${info.project.name} ${Date.now()}`;
  let id;
  try {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
    await expect(page.locator('.stat-grid')).toBeVisible();
    const menu = page.getByRole('button', { name: 'Buka menu' });
    if (await menu.isVisible()) await menu.click();
    await page.locator('.sidebar nav').getByRole('button', { name: 'Produk', exact: true }).click();
    await page.getByRole('button', { name: 'Tambah produk' }).click();
    await page.getByLabel('Nama produk').fill(name);
    await page.getByLabel('Harga (Rp)').fill('99000');
    await page.getByLabel('Ukuran', { exact: true }).fill('M');
    await page.getByLabel('Jenis bunga').fill('Boneka');
    await page.getByLabel('Deskripsi', { exact: true }).fill('Produk pengujian occasion');
    await page.getByRole('checkbox', { name: 'Wisuda', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Hadiah', exact: true }).check();
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const row = page.locator('tr').filter({ hasText: name });
    await expect(row).toContainText('Wisuda');
    await expect(row).toContainText('Hadiah');
    id = (await (await page.request.get('/api/manage/products')).json()).find(
      (p) => p.name === name,
    ).id;
    await row.getByRole('button', { name: 'Edit ' + name }).click();
    await expect(page.getByRole('checkbox', { name: 'Wisuda', exact: true })).toBeChecked();
    await page.getByRole('checkbox', { name: 'Wisuda', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'Wedding', exact: true }).check();
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const item = await (await page.request.get('/api/products/' + id)).json();
    expect(item.categories.map((c) => c.name).sort()).toEqual(['Hadiah', 'Wedding']);
  } finally {
    const me = await page.request.get('/api/auth/me');
    if (me.ok()) {
      const headers = { 'X-CSRF-Token': (await me.json()).csrf_token };
      if (!id)
        id = (await (await page.request.get('/api/manage/products')).json()).find(
          (p) => p.name === name,
        )?.id;
      if (id) {
        const links = (await (await page.request.get('/api/manage/recommendations')).json()).filter(
          (r) => String(r.product_id) === String(id),
        );
        for (const link of links)
          await page.request.delete('/api/manage/recommendations/' + link.id, { headers });
        await page.request.delete('/api/manage/products/' + id, { headers });
      }
    }
  }
});
