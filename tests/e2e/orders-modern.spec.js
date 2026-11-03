import 'dotenv/config';
import { test, expect } from '@playwright/test';

for (const role of ['admin', 'owner']) {
  test(`${role} order workspace supports periods, pagination, filters and role boundaries`, async ({
    page,
  }, info) => {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill(role);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env[role === 'admin' ? 'SEED_ADMIN_PASSWORD' : 'SEED_OWNER_PASSWORD']);
    await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
    await expect(page.locator('.sales-stats')).toBeVisible();
    await expect(
      page.locator('.sidebar nav').getByRole('button', { name: 'Pelanggan', exact: true }),
    ).toHaveCount(0);
    const menu = page.getByRole('button', { name: 'Buka menu' });
    if (await menu.isVisible()) await menu.click();
    await page
      .locator('.sidebar nav')
      .getByRole('button', { name: role === 'admin' ? 'Pesanan' : 'Daftar pesanan', exact: true })
      .click();
    await expect(page.locator('.orders-workspace')).toHaveAttribute('aria-busy', 'false');
    const initial = await (await page.request.get('/api/orders/workspace?period=all')).json();
    const rows = page.locator('.orders-management-table tbody tr');
    await expect(rows).toHaveCount(Math.min(7, initial.total));
    if (initial.total) {
      await expect(rows.first().getByRole('link', { name: /^Chat WhatsApp BV-/ })).toHaveAttribute(
        'href',
        /^https:\/\/wa\.me\/\d+$/,
      );
      await expect(rows.first().getByRole('link', { name: /^Chat WhatsApp BV-/ })).toHaveAttribute(
        'target',
        '_blank',
      );
    }
    await expect(page.locator('[data-summary="completed"] > strong')).toHaveText(
      String(initial.summary.completed),
    );
    await expect(page.getByRole('img', { name: /^Grafik status pesanan:/ })).toBeVisible();
    async function change(action, expected) {
      const response = page.waitForResponse((value) => {
        if (!value.url().includes('/api/orders/workspace?')) return false;
        const parameters = new URL(value.url()).searchParams;
        return Object.entries(expected).every(([name, text]) => parameters.get(name) === text);
      });
      await action();
      const result = await response;
      expect(result.ok()).toBe(true);
      return result.json();
    }
    if (initial.pages > 1) {
      const next = await change(
        () => page.getByRole('button', { name: 'Halaman 2', exact: true }).click(),
        { page: '2' },
      );
      await expect(rows.first()).toHaveAttribute('data-order-id', String(next.orders[0].id));
    }
    for (const [period, label] of [
      ['7', '7 hari terakhir'],
      ['month', 'Bulan ini'],
      ['all', 'Semua waktu'],
    ]) {
      const report = await change(
        () =>
          page
            .getByRole('group', { name: 'Periode pesanan' })
            .getByRole('button', { name: label, exact: true })
            .click(),
        { period, page: '1' },
      );
      await expect(page.locator('[data-summary="total"] > strong')).toHaveText(
        String(report.total),
      );
      await expect(rows).toHaveCount(Math.min(7, report.total));
    }
    const completed = await change(
      () =>
        page
          .getByRole('group', { name: 'Status pesanan' })
          .getByRole('button', { name: 'Selesai', exact: true })
          .click(),
      { status: 'completed' },
    );
    await expect(rows).toHaveCount(Math.min(7, completed.total));
    for (const row of await rows.all()) await expect(row.locator('.badge')).toHaveText('Selesai');
    await change(
      () =>
        page
          .locator('.order-filter-heading')
          .getByRole('button', { name: 'Reset', exact: true })
          .click(),
      { status: 'all', period: 'all', q: '' },
    );
    const source = initial.orders
      .flatMap((order) => order.items)
      .find((item) => item.categories?.length && item.product_type_id);
    if (source) {
      await change(
        () =>
          page.getByLabel('Filter occasion pesanan').selectOption(String(source.categories[0].id)),
        { category: String(source.categories[0].id) },
      );
      const filtered = await change(
        () => page.getByLabel('Filter jenis pesanan').selectOption(String(source.product_type_id)),
        { category: String(source.categories[0].id), type: String(source.product_type_id) },
      );
      await expect(rows).toHaveCount(Math.min(7, filtered.total));
      if (filtered.orders.length)
        await expect(rows.first()).toHaveAttribute('data-order-id', String(filtered.orders[0].id));
    }
    await change(
      () =>
        page
          .locator('.order-filter-heading')
          .getByRole('button', { name: 'Reset', exact: true })
          .click(),
      { status: 'all', period: 'all', q: '' },
    );
    await expect(page.locator('.orders-workspace')).toHaveAttribute('aria-busy', 'false');
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images).map((image) => {
          image.loading = 'eager';
          return image.decode();
        }),
      );
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/screenshots/orders-${role}-${info.project.name}.png`,
      fullPage: true,
    });
    if (role === 'owner') {
      await expect(page.getByRole('button', { name: 'Catat pesanan', exact: true })).toHaveCount(0);
      await expect(rows.getByRole('button', { name: /^(Edit|Hapus|Status) BV-/ })).toHaveCount(0);
      return;
    }
    const marker = 'Modern order ' + info.project.name + ' ' + Date.now();
    let id;
    const me = await (await page.request.get('/api/auth/me')).json();
    const headers = { 'X-CSRF-Token': me.csrf_token };
    try {
      await page.getByRole('button', { name: 'Catat pesanan', exact: true }).click();
      await expect(page.getByLabel('Nomor telepon', { exact: true })).toHaveAttribute(
        'required',
        '',
      );
      const products = await (await page.request.get('/api/products')).json();
      await expect(page.getByLabel('Pilih pemesan tersimpan')).toHaveCount(0);
      await expect(page.getByLabel('Pesanan atas nama siapa', { exact: true })).toHaveValue('');
      await expect(page.getByLabel('Nomor telepon', { exact: true })).toHaveValue('');
      await page.getByLabel('Pesanan atas nama siapa', { exact: true }).fill(marker);
      await page.getByLabel('Nomor telepon', { exact: true }).fill('081234567888');
      await page.getByRole('button', { name: '+1 hari', exact: true }).click();
      await page.getByLabel('Cari produk pesanan').fill(products[0].name);
      await page
        .getByRole('combobox', { name: 'Produk 1', exact: true })
        .selectOption(String(products[0].id));
      await page.getByLabel('Cari produk pesanan').fill('');
      await page.getByRole('button', { name: 'Tambah jumlah 1', exact: true }).click();
      await expect(page.getByRole('spinbutton', { name: 'Jumlah 1', exact: true })).toHaveValue(
        '2',
      );
      await page.getByRole('button', { name: 'Tambah item', exact: true }).click();
      await expect(
        page
          .getByRole('combobox', { name: 'Produk 2', exact: true })
          .locator(`option[value="${products[0].id}"]`),
      ).toHaveJSProperty('disabled', true);
      await page
        .getByRole('combobox', { name: 'Produk 2', exact: true })
        .selectOption(String(products[1].id));
      const total =
        (Math.round(Number(products[0].price) * 100) * 2 +
          Math.round(Number(products[1].price) * 100)) /
        100;
      const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(total);
      await expect(page.locator('.order-total')).toContainText(formatted);
      await page.getByLabel('Permintaan / kartu ucapan').fill('Bungkus biru dan kartu ucapan.');
      await page
        .getByRole('dialog')
        .screenshot({ path: `docs/screenshots/order-editor-${info.project.name}.png` });
      const saved = page.waitForResponse(
        (value) => value.url().endsWith('/api/orders') && value.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Simpan', exact: true }).click();
      const response = await saved;
      expect(response.ok()).toBe(true);
      id = (await response.json()).id;
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const created = page.locator(`tr[data-order-id="${id}"]`);
      await expect(created).toContainText(marker);
      await expect(created.getByRole('link', { name: /^Chat WhatsApp BV-/ })).toHaveAttribute(
        'href',
        'https://wa.me/6281234567888',
      );
      await created.getByRole('button', { name: /^Edit BV-/ }).click();
      await expect(page.getByLabel('Pesanan atas nama siapa', { exact: true })).toHaveValue(marker);
      await expect(page.getByRole('spinbutton', { name: 'Jumlah 1', exact: true })).toHaveValue(
        '2',
      );
      await page.getByRole('button', { name: 'Simpan', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    } finally {
      if (!id)
        id = (
          await (
            await page.request.get('/api/orders/workspace?q=' + encodeURIComponent(marker))
          ).json()
        ).orders[0]?.id;
      if (id) await page.request.delete('/api/orders/' + id, { headers });
    }
  });
}
