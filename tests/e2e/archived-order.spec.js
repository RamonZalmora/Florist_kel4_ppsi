import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';

test('admin can edit an unfinished order containing an archived product', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const api = page.context().request;
  const me = await (await api.get('/api/auth/me')).json();
  const headers = { 'X-CSRF-Token': me.csrf_token };
  const name = 'Archive fixture ' + randomBytes(4).toString('hex');
  const product = {
    name,
    price: 170000,
    flower_type: 'Bunga',
    size: 'M',
    description: 'Test',
    photo: '/assets/bien-mark.svg',
    active: true,
  };
  const p = await (await api.post('/api/manage/products', { headers, data: product })).json();
  let id;
  try {
    const orderResponse = await api.post('/api/orders', {
      headers,
      data: {
        customer_name: name,
        phone_number: '081234567777',
        order_date: '2026-11-01',
        delivery_date: '2026-11-02',
        request: '',
        items: [{ product_id: p.id, quantity: 1 }],
      },
    });
    expect(orderResponse.ok()).toBe(true);
    id = (await orderResponse.json()).id;
    expect(
      (
        await api.put('/api/manage/products/' + p.id, {
          headers,
          data: { ...product, price: 999000, active: false },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    const menu = page.getByRole('button', { name: 'Buka menu' });
    if (await menu.isVisible()) await menu.click();
    await page
      .locator('.sidebar nav')
      .getByRole('button', { name: 'Pesanan', exact: true })
      .click();
    const row = page.locator('tr').filter({ hasText: name });
    await row.getByRole('button', { name: /^Edit BV-/ }).click();
    await expect(
      page.getByRole('combobox', { name: 'Produk 1' }).locator('option:checked'),
    ).toContainText('(arsip)');
    await expect(page.locator('.order-total')).toContainText('170.000');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(row).toContainText('170.000');
  } finally {
    if (id) await api.delete('/api/orders/' + id, { headers });
    await api.delete('/api/manage/products/' + p.id, { headers });
  }
});
