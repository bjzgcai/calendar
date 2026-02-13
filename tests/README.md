# Calendar Application - E2E Testing with Playwright

This directory contains end-to-end tests for cross-browser and device compatibility testing.

## Setup

Playwright and browsers are already installed. If you need to reinstall:

```bash
pnpm add -D playwright @playwright/test
npx playwright install chromium firefox webkit
```

## Test Suites

### 1. Calendar Compatibility (`calendar-compatibility.spec.ts`)
Tests basic calendar functionality across all browsers:
- Calendar loading and rendering
- View switching (week/day based on viewport)
- Navigation (prev/next)
- Event creation dialog
- Filter section rendering
- Chinese text rendering
- Console error checking

### 2. Responsive Layout (`responsive-layout.spec.ts`)
Tests layout behavior across different device sizes:
- **Desktop**: 1920x1080, 1366x768
- **Tablet**: 768x1024 (portrait), 1024x768 (landscape)
- **Mobile**: iPhone 12, iPhone SE, Android
- Orientation changes
- Screenshots for each viewport

### 3. Browser-Specific (`browser-specific.spec.ts`)
Tests browser-specific features:
- Chromium, Firefox, WebKit rendering
- CSS Grid/Flexbox support
- Web fonts loading
- Touch events on mobile
- CSS custom properties
- Layout stability (CLS)

### 4. Performance (`performance.spec.ts`)
Tests performance metrics:
- Page load time
- Core Web Vitals (LCP, FID, CLS)
- Memory usage
- Interaction responsiveness

## Test Configuration

Tests run across 17 different browser/device configurations:

**Desktop Browsers:**
- Chromium (1920x1080)
- Firefox (1920x1080)
- WebKit/Safari (1920x1080)

**Tablets:**
- iPad Pro (portrait)
- iPad Pro (landscape)

**Mobile - Global Devices:**
- iPhone 12 (390x844)
- iPhone SE (375x667)
- Pixel 5 (393x851)
- Galaxy S9+ (360x740)

**Mobile - China Market:**
- Honor 50 荣耀50 (375x812)
- Honor X40 荣耀X40 (412x915)
- Xiaomi 12 小米12 (393x851)
- Redmi Note 11 红米Note 11 (393x873)
- OPPO Reno 8 (412x915)
- OPPO Find X5 (412x919)
- vivo X90 (412x915)
- vivo S16 (393x851)

## Running Tests

### Run all tests
```bash
pnpm test:e2e
```

### Run with UI mode (interactive)
```bash
pnpm test:e2e:ui
```

### Run in headed mode (see browser)
```bash
pnpm test:e2e:headed
```

### Run specific browser
```bash
pnpm test:e2e:chromium   # Chrome only
pnpm test:e2e:firefox    # Firefox only
pnpm test:e2e:webkit     # Safari/WebKit only
pnpm test:e2e:mobile     # Global mobile devices only
pnpm test:e2e:china      # China market devices only
```

### View HTML report
```bash
pnpm test:e2e:report
```

## Generate Compatibility Report

After running tests, generate a detailed compatibility report:

```bash
tsx scripts/generate-compatibility-report.ts
```

This creates:
- `test-results/compatibility-report.json` - Raw data
- `test-results/compatibility-report.md` - Markdown report
- `test-results/screenshots/` - Screenshots for each viewport

## Expected Behavior

### Responsive Breakpoints
- **Desktop (≥768px)**: Week view
- **Mobile (<768px)**: Day view

### Browser Support
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari/WebKit
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Performance Targets
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **Page Load**: < 5s
- **JS Heap**: < 50MB initial

## Troubleshooting

### Tests fail to start dev server
Make sure no other process is using port 5002:
```bash
lsof -ti:5002 | xargs kill -9
```

### Browser installation issues
Install browsers manually:
```bash
npx playwright install --with-deps
```

### Screenshots not generated
Check that `test-results/screenshots/` directory exists:
```bash
mkdir -p test-results/screenshots
```

## CI/CD Integration

The tests are configured for CI environments. Set `CI=true` to:
- Enable retries (2 attempts)
- Use single worker
- Enforce no `.only` tests

```bash
CI=true pnpm test:e2e
```

## Files Structure

```
tests/
├── e2e/
│   ├── calendar-compatibility.spec.ts  # Core functionality tests
│   ├── responsive-layout.spec.ts       # Viewport/device tests
│   ├── browser-specific.spec.ts        # Browser feature tests
│   └── performance.spec.ts             # Performance metrics
├── README.md                            # This file
playwright.config.ts                     # Playwright configuration
scripts/generate-compatibility-report.ts # Report generator
test-results/                            # Test outputs (gitignored)
```

## Screenshots Location

All screenshots are saved to `test-results/screenshots/`:
- `desktop-1920x1080.png`
- `laptop-1366x768.png`
- `tablet-768x1024.png`
- `tablet-1024x768.png`
- `iphone-12-390x844.png`
- `iphone-se-375x667.png`
- `android-360x640.png`
- `mobile-landscape-844x390.png`
- `chromium-calendar.png`
- `firefox-calendar.png`
- `webkit-calendar.png`
