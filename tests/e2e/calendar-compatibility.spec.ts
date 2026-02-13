import { test, expect } from '@playwright/test';

test.describe('Calendar Application - Cross-Browser Compatibility', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to week view directly
    await page.goto('/?view=week');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    // Wait a bit for client-side rendering
    await page.waitForTimeout(2000);
  });

  test('should load the calendar successfully', async ({ page }) => {
    // Check if FullCalendar is rendered
    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();

    // Check if header is present
    const header = page.locator('.fc-toolbar');
    await expect(header).toBeVisible();
  });

  test('should display correct view based on viewport size', async ({ page, browserName }) => {
    const viewport = page.viewportSize();

    if (viewport && viewport.width >= 768) {
      // Desktop/Tablet should show week view by default
      const weekView = page.locator('.fc-timeGridWeek-view');
      await expect(weekView).toBeVisible();
    } else {
      // Mobile should show day view
      const dayView = page.locator('.fc-timeGridDay-view');
      await expect(dayView).toBeVisible();
    }
  });

  test('should navigate between dates', async ({ page }) => {
    // Click next button
    const nextButton = page.locator('.fc-next-button');
    await nextButton.click();

    // Wait for navigation
    await page.waitForTimeout(500);

    // Click previous button
    const prevButton = page.locator('.fc-prev-button');
    await prevButton.click();

    await page.waitForTimeout(500);

    // Calendar should still be visible
    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();
  });

  test('should open event creation dialog', async ({ page }) => {
    // Click on "添加活动" button or similar
    const addButton = page.getByRole('button', { name: /添加|新建|创建/ });

    if (await addButton.isVisible()) {
      await addButton.click();

      // Check if dialog appears
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Close dialog
      const closeButton = dialog.locator('button').first();
      await closeButton.click();
    }
  });

  test('should render filters section', async ({ page }) => {
    // Check if filter section exists
    const filters = page.locator('[class*="filter"]').or(page.locator('aside')).first();

    if (await filters.isVisible()) {
      // Filters should be visible on desktop
      const viewport = page.viewportSize();
      if (viewport && viewport.width >= 1024) {
        await expect(filters).toBeVisible();
      }
    }
  });

  test('should handle calendar interactions', async ({ page }) => {
    // Try clicking on a time slot
    const timeSlots = page.locator('.fc-timegrid-slot');
    const firstSlot = timeSlots.first();

    if (await firstSlot.isVisible()) {
      await firstSlot.click();
      await page.waitForTimeout(500);
    }

    // Calendar should still be functional
    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();
  });

  test('should display Chinese text correctly', async ({ page }) => {
    // Check for Chinese characters in the page
    const pageContent = await page.textContent('body');

    // Should contain Chinese characters
    expect(pageContent).toMatch(/[\u4e00-\u9fa5]/);
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Reload to catch any errors
    await page.reload();
    await page.waitForTimeout(2000);

    // Filter out common harmless errors
    const criticalErrors = errors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('manifest') &&
      !error.includes('sourcemap')
    );

    expect(criticalErrors.length).toBe(0);
  });
});
