import { test, expect } from '@playwright/test';

test.describe('Responsive Layout Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/?view=week');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('Desktop (1920x1080) - should show week view', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForSelector('.fc', { timeout: 10000 });

    // Should show week view
    const weekView = page.locator('.fc-timeGridWeek-view');
    await expect(weekView).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/desktop-1920x1080.png', fullPage: true });
  });

  test('Laptop (1366x768) - should show week view', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.reload();
    await page.waitForSelector('.fc', { timeout: 10000 });

    const weekView = page.locator('.fc-timeGridWeek-view');
    await expect(weekView).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/laptop-1366x768.png', fullPage: true });
  });

  test('Tablet Portrait (768x1024) - should show appropriate view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForSelector('.fc', { timeout: 10000 });

    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/tablet-768x1024.png', fullPage: true });
  });

  test('Tablet Landscape (1024x768) - should show week view', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.reload();
    await page.waitForSelector('.fc', { timeout: 10000 });

    const weekView = page.locator('.fc-timeGridWeek-view');
    await expect(weekView).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/tablet-1024x768.png', fullPage: true });
  });

  test('iPhone 12 (390x844) - should show day view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForSelector('.fc', { timeout: 10000 });

    const dayView = page.locator('.fc-timeGridDay-view');
    await expect(dayView).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/iphone-12-390x844.png', fullPage: true });
  });

  test('iPhone SE (375x667) - should show day view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('.fc', { timeout: 10000 });

    const dayView = page.locator('.fc-timeGridDay-view');
    await expect(dayView).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/iphone-se-375x667.png', fullPage: true });
  });

  test('Android (360x640) - should show day view', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.reload();
    await page.waitForSelector('.fc', { timeout: 10000 });

    const dayView = page.locator('.fc-timeGridDay-view');
    await expect(dayView).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/android-360x640.png', fullPage: true });
  });

  test('Mobile landscape - should handle orientation change', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForSelector('.fc', { timeout: 10000 });

    // Switch to landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(1000);

    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();

    await page.screenshot({ path: 'test-results/screenshots/mobile-landscape-844x390.png', fullPage: true });
  });
});
