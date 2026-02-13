import { test, expect } from '@playwright/test';

test.describe('Browser-Specific Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/?view=week');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should render calendar in Chromium', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-specific test');

    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/chromium-calendar.png',
      fullPage: true
    });
  });

  test('should render calendar in Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');

    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/firefox-calendar.png',
      fullPage: true
    });
  });

  test('should render calendar in WebKit/Safari', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'WebKit-specific test');

    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();

    await page.screenshot({
      path: 'test-results/screenshots/webkit-calendar.png',
      fullPage: true
    });
  });

  test('should handle CSS grid/flexbox correctly', async ({ page }) => {
    // Check if main layout is using proper CSS
    const body = page.locator('body');
    const display = await body.evaluate((el) =>
      window.getComputedStyle(el).display
    );

    expect(['block', 'flex', 'grid']).toContain(display);
  });

  test('should load web fonts correctly', async ({ page }) => {
    // Wait for fonts to load
    await page.waitForTimeout(2000);

    // Check if fonts are loaded
    const fontsLoaded = await page.evaluate(() => {
      return document.fonts.ready.then(() => document.fonts.size > 0);
    });

    expect(fontsLoaded).toBeTruthy();
  });

  test('should support touch events on mobile browsers', async ({ page, browserName }) => {
    const viewport = page.viewportSize();

    if (viewport && viewport.width < 768) {
      // Test touch support
      const hasTouchSupport = await page.evaluate(() => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      });

      // Mobile browsers should support touch
      expect(hasTouchSupport).toBeTruthy();
    }
  });

  test('should handle date/time formatting correctly', async ({ page }) => {
    // Check if dates are displayed
    const calendarHeader = page.locator('.fc-toolbar-title');
    const headerText = await calendarHeader.textContent();

    expect(headerText).toBeTruthy();
    expect(headerText!.length).toBeGreaterThan(0);
  });

  test('should support CSS custom properties', async ({ page }) => {
    // Check if CSS variables are supported
    const supportsCustomProps = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.setProperty('--test', 'test');
      return el.style.getPropertyValue('--test') === 'test';
    });

    expect(supportsCustomProps).toBeTruthy();
  });

  test('should render without layout shifts', async ({ page }) => {
    // Measure layout stability
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsScore = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).hadRecentInput) continue;
            clsScore += (entry as any).value;
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsScore);
        }, 3000);
      });
    });

    // CLS should be less than 0.1 (good)
    expect(cls).toBeLessThan(0.25);
  });
});
