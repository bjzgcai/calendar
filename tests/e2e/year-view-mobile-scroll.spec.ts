import { test, expect } from '@playwright/test';

function getCurrentMonthHeading() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}年${month}月`;
}

test.describe('Year View Mobile Scroll', () => {
  test('mobile year view should scroll current month card into view', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width >= 768, 'Mobile-only behavior');

    await page.goto('/?view=year');
    await page.waitForSelector('h2:has-text("年活动列表")', { timeout: 10000 });

    const currentMonthHeading = page
      .locator('h3')
      .filter({ hasText: getCurrentMonthHeading() })
      .first();

    await expect(currentMonthHeading).toBeVisible();

    await expect
      .poll(async () => page.evaluate(() => window.scrollY), { timeout: 10000 })
      .toBeGreaterThan(100);

    const headingBox = await currentMonthHeading.boundingBox();
    expect(headingBox).not.toBeNull();
    expect(headingBox!.y).toBeLessThan(450);
  });
});
