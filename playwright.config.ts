import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Tablet
    {
      name: 'ipad',
      use: {
        ...devices['iPad Pro'],
      },
    },
    {
      name: 'ipad-landscape',
      use: {
        ...devices['iPad Pro landscape'],
      },
    },

    // Mobile
    {
      name: 'iphone-12',
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'iphone-se',
      use: {
        ...devices['iPhone SE'],
      },
    },
    {
      name: 'pixel-5',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'galaxy-s9',
      use: {
        ...devices['Galaxy S9+'],
      },
    },

    // Popular Chinese mobile devices
    {
      name: 'honor-50',
      use: {
        userAgent: 'Mozilla/5.0 (Linux; Android 11; YOK-AN10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'honor-x40',
      use: {
        userAgent: 'Mozilla/5.0 (Linux; Android 12; ANY-AN00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36',
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'xiaomi-12',
      use: {
        userAgent: 'Mozilla/5.0 (Linux; Android 12; 2201123C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36',
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'redmi-note-11',
      use: {
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Redmi Note 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.74 Mobile Safari/537.36',
        viewport: { width: 393, height: 873 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'oppo-reno-8',
      use: {
        userAgent: 'Mozilla/5.0 (Linux; Android 12; PGAM10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36',
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'oppo-find-x5',
      use: {
        userAgent: 'Mozilla/5.0 (Linux; Android 12; PFDM00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Mobile Safari/537.36',
        viewport: { width: 412, height: 919 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'vivo-x90',
      use: {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; V2227A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'vivo-s16',
      use: {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; V2244A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
        viewport: { width: 393, height: 851 },
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
