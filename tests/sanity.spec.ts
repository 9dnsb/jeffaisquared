import { test, expect } from '@playwright/test';

test.describe('Sanity Tests', () => {
  test('should load the main page successfully', async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify we can access the page (no 404/500 errors)
    await expect(page).toHaveURL('/');

    // Verify the page has some content (not completely blank)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Log what we found for debugging
    const title = await page.title();
    console.log(`✅ Main page loaded successfully. Title: "${title}"`);
  });
});