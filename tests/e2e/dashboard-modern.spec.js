import 'dotenv/config';
import { test, expect } from '@playwright/test';

for (const role of ['admin', 'owner']) {
  test(`${role} dashboard switches sales periods and shows all occasions`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username', { exact: true }).fill(role);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env[role === 'admin' ? 'SEED_ADMIN_PASSWORD' : 'SEED_OWNER_PASSWORD']);
    await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
    await expect(page.locator('.sales-stats')).toBeVisible();
    const dashboard = await (await page.request.get('/api/dashboard')).json();
    const ranges = page.getByRole('group', { name: 'Periode penjualan' });
    for (const days of [7, 30, 7]) {
      await ranges.getByRole('button', { name: `${days} hari`, exact: true }).click();
      await expect(
        ranges.getByRole('button', { name: `${days} hari`, exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page.getByRole('img', { name: new RegExp(`^Penjualan ${days} hari terakhir:`) }),
      ).toBeVisible();
      const trend = dashboard.trend30.slice(-days);
      const formatMoney = (value) =>
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(value);
      await expect(page.locator('.sales-summary-total')).toHaveText(
        formatMoney(trend.reduce((sum, day) => sum + Number(day.total), 0)),
      );
    }
    const categoryPeriod = page.getByLabel('Periode kategori terlaris');
    await expect(categoryPeriod).toHaveValue('all');
    for (const group of ['category', 'type', 'category']) {
      await page.getByLabel('Kelompok produk terlaris').selectOption(group);
      for (const period of ['all', '30', 'all']) {
        await categoryPeriod.selectOption(period);
        const soldUnits = Number(
          period === 'all'
            ? dashboard.completedOrderSales.all_time
            : dashboard.completedOrderSales.last_30_days,
        );
        const breakdown =
          group === 'category' ? dashboard.occasionSales : dashboard.productTypeSales;
        await expect(page.locator('.sales-legend > div')).toHaveCount(breakdown.length);
        for (const occasion of breakdown) {
          const quantity =
            period === 'all'
              ? Number(occasion.total_orders)
              : occasion.sales.reduce((sum, sale) => sum + Number(sale.orders), 0);
          const legend = page.locator(
            `.sales-legend > [data-occasion-id="${occasion.id ?? 'unassigned'}"]`,
          );
          await expect(legend).toHaveCount(1);
          await expect(legend.locator('small')).toHaveText(`${quantity} pesanan`);
          const percentage = soldUnits ? (quantity / soldUnits) * 100 : 0;
          await expect(legend.locator('strong')).toHaveText(
            new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(percentage) + '%',
          );
        }
        await expect(page.locator('.sales-donut strong')).toHaveText(String(soldUnits));
        await expect(page.locator('.sales-donut small')).toHaveText('pesanan selesai');
        await expect(ranges.getByRole('button', { name: '7 hari', exact: true })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
