import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {

  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if page loaded
    const title = await page.title();
    console.log('Page title:', title);

    // Take a screenshot
    await page.screenshot({ path: 'test-results/screenshots/homepage.png', fullPage: true });

    // Check if body exists
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have calendar container in week view', async ({ page }) => {
    await page.goto('/?view=week');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/screenshots/week-view.png', fullPage: true });

    // Check if calendar exists
    const calendar = page.locator('.fc');
    const calendarCount = await calendar.count();

    console.log('Calendar count:', calendarCount);

    if (calendarCount > 0) {
      await expect(calendar).toBeVisible();
      console.log('✅ Calendar is visible!');
    } else {
      console.log('❌ Calendar not found');
    }
  });
});
