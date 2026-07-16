import { test, expect } from '@playwright/test';
test('newsletter flow smoke', async ({ page }) => {
  await page.goto('/newsletters');
  await expect(page.getByRole('heading', { name: 'Newsletter' })).toBeVisible();
});
