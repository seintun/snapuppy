import { test, expect } from '@playwright/test';

test.describe('Snapuppy E2E Tests', () => {
  test('login screen loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Sign In')).toBeVisible({ timeout: 10000 });
  });
});
