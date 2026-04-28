import { test, expect } from '@playwright/test';

function getCurrentMonthHeading() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}年${month}月`;
}

test.describe('Year View Current Month Scroll', () => {
  test('year view should scroll current month card into view on every viewport', async ({ page }) => {
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

    const header = page.locator('[data-calendar-header="true"]');

    await expect
      .poll(async () => {
        const headingBox = await currentMonthHeading.boundingBox();
        const headerBox = await header.boundingBox();
        const viewport = page.viewportSize();

        if (!headingBox || !headerBox || !viewport) return false;

        return (
          headingBox.y >= headerBox.y + headerBox.height - 1 &&
          headingBox.y < viewport.height
        );
      }, { timeout: 5000 })
      .toBe(true);
  });

  test('header should remain sticky while scrolling year view', async ({ page }) => {
    await page.goto('/?view=year');
    await page.waitForSelector('h1:has-text("学院活动日历")', { timeout: 10000 });

    const header = page.locator('[data-calendar-header="true"]');
    await expect(header).toBeVisible();

    const before = await header.boundingBox();
    expect(before).not.toBeNull();

    await page.evaluate(() => window.scrollTo(0, 900));

    await expect
      .poll(async () => {
        const box = await header.boundingBox();
        return Math.round(box?.y ?? -1);
      }, { timeout: 5000 })
      .toBeLessThanOrEqual(1);
  });
});
