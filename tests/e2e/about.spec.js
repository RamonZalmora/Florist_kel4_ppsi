import { test, expect } from '@playwright/test';

test('about page works directly and through navigation on all screen sizes', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('link', { name: 'Tentang kami', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { name: /Untuk momen yang/ })).toBeVisible();
  for (const name of ['WhatsApp', 'Shopee', 'Tokopedia', 'Instagram']) {
    await expect(
      page.locator('.about-contact .social-links').getByText(name, { exact: true }),
    ).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: /Untuk momen yang/ })).toBeVisible();
  await page.getByRole('button', { name: 'Jelajahi koleksi' }).click();
  await expect(page.locator('.product-card').first()).toBeVisible();
  await expect(page.getByText('Harga minimum')).toHaveCount(0);
  await expect(page.getByText('Anggaran', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('about page links to the channels configured by the store', async ({ page }) => {
  await page.route('**/api/store', (route) =>
    route.fulfill({
      json: {
        name: 'Florist',
        address: '',
        description: '',
        logo: '',
        whatsapp: '6281234567890',
        instagram: 'https://www.instagram.com/florist/',
        shopee: 'https://shopee.co.id/bienvendreofficial',
        tokopedia: 'https://www.tokopedia.com/bienvendreofficialb?source=universe&st=product',
        about_story: 'Cerita khusus dari owner',
        about_service: 'Konsultasi khusus dari owner',
        care_tips: 'Tips khusus dari owner',
      },
    }),
  );
  await page.goto('/about');
  await expect(page.getByText('Cerita khusus dari owner')).toBeVisible();
  await expect(page.getByText('Konsultasi khusus dari owner')).toBeVisible();
  await expect(page.getByText('Tips khusus dari owner')).toBeVisible();
  await expect(
    page.locator('.about-contact .social-links').getByRole('link', { name: 'WhatsApp' }),
  ).toHaveAttribute('href', 'https://wa.me/6281234567890');
  await expect(
    page.locator('.about-contact .social-links').getByRole('link', { name: 'Instagram' }),
  ).toHaveAttribute('href', 'https://www.instagram.com/florist/');
  await expect(
    page.locator('.about-contact .social-links').getByRole('link', { name: 'Shopee' }),
  ).toHaveAttribute('href', 'https://shopee.co.id/bienvendreofficial');
  await expect(
    page.locator('.about-contact .social-links').getByRole('link', { name: 'Tokopedia' }),
  ).toHaveAttribute(
    'href',
    'https://www.tokopedia.com/bienvendreofficialb?source=universe&st=product',
  );
});
