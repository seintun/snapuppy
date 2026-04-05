import { test, expect } from '@playwright/test';

test.describe('Snapuppy E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('login screen loads', async ({ page }) => {
    await expect(page.locator('text=Enter your passcode')).toBeVisible();
  });

  test('can login with valid passcode', async ({ page }) => {
    await page.fill('input[type="tel"]', '1234');
    await page.click('button:has-text("Enter")');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('navigation works', async ({ page }) => {
    await page.fill('input[type="tel"]', '1234');
    await page.click('button:has-text("Enter")');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

    await page.click('text=Calendar');
    await expect(page.locator('text=Calendar')).toBeVisible();

    await page.click('text=Dogs');
    await expect(page.locator('text=Your Dogs')).toBeVisible();
  });
});
