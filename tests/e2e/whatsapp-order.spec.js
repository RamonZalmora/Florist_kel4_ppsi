import { test, expect } from '@playwright/test';

test('product order opens WhatsApp with the chosen product and price', async ({ page }) => {
  await page.route('**/api/store', (route) =>
    route.fulfill({
      json: {
        name: 'Florist',
        address: '',
        description: '',
        logo: '',
        whatsapp: '6282380087007',
        instagram: '',
        tiktok: '',
      },
    }),
  );
  await page.goto('/catalog');
  const card = page.locator('.product-card').first();
  const name = await card.locator('h3').textContent();
  const price = (await card.locator('.product-price').textContent()).replace(/\s/g, '');
  const link = card.getByRole('link', { name: `Pesan ${name} via WhatsApp` });
  await expect(link).toBeVisible();
  const url = new URL(await link.getAttribute('href'));
  expect(url.origin + url.pathname).toBe('https://wa.me/6282380087007');
  expect(url.searchParams.get('text')).toContain(name);
  expect(url.searchParams.get('text').replace(/\s/g, '')).toContain(price);
  expect(await link.getAttribute('target')).toBe('_blank');
});

test('products do not offer a broken link when WhatsApp is unset', async ({ page }) => {
  await page.route('**/api/store', (route) =>
    route.fulfill({
      json: {
        name: 'Florist',
        address: '',
        description: '',
        logo: '',
        whatsapp: '',
        instagram: '',
        tiktok: '',
      },
    }),
  );
  await page.goto('/catalog');
  await expect(
    page.locator('.product-card').first().getByText('WhatsApp belum tersedia'),
  ).toBeVisible();
  await expect(page.locator('.product-card').first().locator('.product-order')).toHaveCount(0);
});
