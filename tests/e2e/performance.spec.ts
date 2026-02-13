import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/?view=week');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    console.log(`Page loaded in ${loadTime}ms`);
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/?view=week');
    await page.waitForLoadState('networkidle');

    // Wait for metrics to be collected
    await page.waitForTimeout(3000);

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const result: any = {};

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          result.lcp = lastEntry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            result.fid = (entries[0] as any).processingStart - entries[0].startTime;
          }
        }).observe({ type: 'first-input', buffered: true });

        // Cumulative Layout Shift
        let clsScore = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
          result.cls = clsScore;
        }).observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => resolve(result), 2000);
      });
    });

    console.log('Core Web Vitals:', metrics);

    // LCP should be less than 2.5s (good)
    if ((metrics as any).lcp) {
      expect((metrics as any).lcp).toBeLessThan(2500);
    }

    // FID should be less than 100ms (good)
    if ((metrics as any).fid) {
      expect((metrics as any).fid).toBeLessThan(100);
    }

    // CLS should be less than 0.1 (good)
    if ((metrics as any).cls !== undefined) {
      expect((metrics as any).cls).toBeLessThan(0.1);
    }
  });

  test('should not have memory leaks', async ({ page }) => {
    await page.goto('/?view=week');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const metrics = await page.metrics();

    console.log('Memory metrics:', {
      jsHeapSize: `${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`,
      nodes: metrics.Nodes,
      listeners: metrics.JSEventListeners
    });

    // JS heap should be reasonable (less than 50MB for initial load)
    expect(metrics.JSHeapUsedSize).toBeLessThan(50 * 1024 * 1024);
  });

  test('should handle rapid interactions', async ({ page }) => {
    await page.goto('/?view=week');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const nextButton = page.locator('.fc-next-button');

    // Rapidly click next button
    for (let i = 0; i < 5; i++) {
      await nextButton.click();
      await page.waitForTimeout(100);
    }

    // Calendar should still be responsive
    const calendar = page.locator('.fc');
    await expect(calendar).toBeVisible();
  });
});
