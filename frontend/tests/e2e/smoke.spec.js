import { test, expect } from '@playwright/test';

test('MyGold application opens successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My Gold/i);
});
