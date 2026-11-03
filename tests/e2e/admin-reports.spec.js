import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

for (const role of ['admin', 'owner']) {
  test(`${role} report history supports periods, filters, pagination, PDF and full Excel downloads`, async ({
    page,
  }, info) => {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill(role);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env[role === 'admin' ? 'SEED_ADMIN_PASSWORD' : 'SEED_OWNER_PASSWORD']);
    await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
    await expect(page.locator('.sales-stats')).toBeVisible();
    const menu = page.getByRole('button', { name: 'Buka menu' });
    if (await menu.isVisible()) await menu.click();
    await page
      .locator('.sidebar nav')
      .getByRole('button', { name: 'Riwayat & laporan', exact: true })
      .click();
    await expect(page.locator('.reports-workspace')).toHaveAttribute('aria-busy', 'false');
    const rows = page.locator('.sales-history-table tbody tr');
    const initial = await (await page.request.get('/api/reports/workspace?period=all')).json();
    await expect(rows).toHaveCount(Math.min(7, initial.count));
    await expect(page.locator('[data-report-stat="count"] > strong')).toHaveText(
      String(initial.count),
    );
    async function change(action, expected) {
      const next = page.waitForResponse((response) => {
        if (!response.url().includes('/api/reports/workspace?')) return false;
        const params = new URL(response.url()).searchParams;
        return Object.entries(expected).every(([name, value]) => params.get(name) === value);
      });
      await action();
      const response = await next;
      expect(response.ok()).toBe(true);
      return response.json();
    }
    if (initial.pages > 1) {
      const second = await change(
        () => page.getByRole('button', { name: 'Halaman 2', exact: true }).click(),
        { page: '2' },
      );
      await expect(rows.first()).toHaveAttribute('data-sale-id', String(second.rows[0].id));
    }
    for (const [period, label] of [
      ['7', '7 hari terakhir'],
      ['month', 'Bulan ini'],
      ['all', 'Semua waktu'],
    ]) {
      const report = await change(
        () =>
          page
            .getByRole('group', { name: 'Periode laporan' })
            .getByRole('button', { name: label, exact: true })
            .click(),
        { period, page: '1' },
      );
      await expect(page.locator('[data-report-stat="count"] > strong')).toHaveText(
        String(report.count),
      );
      await expect(rows).toHaveCount(Math.min(7, report.count));
    }
    await page.getByLabel('Dari tanggal', { exact: true }).fill('2020-01-01');
    await page.getByLabel('Sampai tanggal', { exact: true }).fill('2030-01-01');
    const custom = await change(
      () => page.getByRole('button', { name: 'Tampilkan', exact: true }).click(),
      { period: 'custom', from: '2020-01-01', to: '2030-01-01' },
    );
    await expect(page.locator('.reports-active-period')).toContainText('2030');
    await expect(page.locator('.reports-workspace')).toHaveAttribute('aria-busy', 'false');
    await mkdir('.local/report-qa', { recursive: true });
    for (const [label, extension] of [
      ['Unduh PDF', 'pdf'],
      ['Unduh Excel', 'xlsx'],
    ]) {
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: label, exact: true }).click();
      const download = await pending;
      expect(download.suggestedFilename()).toBe(`bien-vendre-2020-01-01-2030-01-01.${extension}`);
      expect(await download.failure()).toBeNull();
      const file = `.local/report-qa/${role}-${info.project.name}.${extension}`;
      await download.saveAs(file);
      const bytes = await readFile(file);
      if (extension === 'pdf') expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      else {
        const zip = unzipSync(new Uint8Array(bytes));
        const sheet = strFromU8(zip['xl/worksheets/sheet2.xml']);
        expect(sheet).toContain(`autoFilter ref="A6:F${Math.max(6, 6 + custom.count)}"`);
        expect(strFromU8(zip['xl/workbook.xml'])).toContain('name="Ringkasan"');
      }
    }
    const types = await (await page.request.get('/api/product-types')).json();
    const categories = await (await page.request.get('/api/categories')).json();
    if (types.length && categories.length) {
      await change(
        () => page.getByLabel('Filter occasion laporan').selectOption(String(categories[0].id)),
        { category: String(categories[0].id) },
      );
      const filtered = await change(
        () => page.getByLabel('Filter jenis laporan').selectOption(String(types[0].id)),
        { category: String(categories[0].id), type: String(types[0].id) },
      );
      await expect(rows).toHaveCount(Math.min(7, filtered.count));
    }
    await change(
      () =>
        page
          .locator('.reports-filter-heading')
          .getByRole('button', { name: 'Reset', exact: true })
          .click(),
      { period: 'all', q: '' },
    );
    const sorted = await change(() => page.getByLabel('Urutan laporan').selectOption('highest'), {
      sort: 'highest',
    });
    if (sorted.rows.length)
      await expect(rows.first()).toHaveAttribute('data-sale-id', String(sorted.rows[0].id));
    await change(
      () => page.getByLabel('Cari riwayat penjualan').fill('No sales match this phrase 987654321'),
      { q: 'No sales match this phrase 987654321' },
    );
    await expect(rows).toHaveCount(0);
    await expect(page.locator('[data-report-stat="total"] > strong')).toContainText('0');
    await change(
      () =>
        page
          .locator('.reports-filter-heading')
          .getByRole('button', { name: 'Reset', exact: true })
          .click(),
      { period: 'all', q: '', sort: 'recent' },
    );
    await expect(page.locator('.reports-workspace')).toHaveAttribute('aria-busy', 'false');
    if (initial.count) {
      await rows
        .first()
        .getByRole('button', { name: /^Detail penjualan BV-/ })
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.report-detail-total')).toBeVisible();
      await page.getByRole('button', { name: 'Tutup', exact: true }).click();
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `docs/screenshots/reports-${role}-${info.project.name}.png`,
      fullPage: true,
    });
  });
}
