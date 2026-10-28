import { test, expect } from '@playwright/test';
test('configured store channels and product order use the supplied links', async ({ page }) => {
  await page.goto('/catalog');
  const dock = page.locator('.floating-social');
  const expected = {
    WhatsApp: 'https://wa.me/6282380087007',
    Shopee: 'https://shopee.co.id/bienvendreofficial',
    Tokopedia: 'https://www.tokopedia.com/bienvendreofficialb?source=universe&st=product',
    Instagram: 'https://www.instagram.com/bienvendreofficial?psln=bm10anhqdTk5eG1y',
  };
  for (const [name, url] of Object.entries(expected))
    await expect(dock.getByRole('link', { name })).toHaveAttribute('href', url);
  await expect(dock.getByRole('link', { name: 'TikTok' })).toHaveCount(0);
  const order = page.locator('.product-card').first().locator('.product-order');
  await expect(order).toHaveAttribute('href', /^https:\/\/wa\.me\/6282380087007\?text=/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
