#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  status: string;
  duration: number;
  errors?: string[];
}

interface ProjectResults {
  [testName: string]: TestResult;
}

interface CompatibilityReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  browsers: {
    [browser: string]: {
      passed: number;
      failed: number;
      tests: ProjectResults;
    };
  };
  devices: {
    desktop: string[];
    tablet: string[];
    mobile: string[];
  };
}

function generateReport() {
  const resultsPath = join(process.cwd(), 'test-results', 'results.json');

  if (!existsSync(resultsPath)) {
    console.error('No test results found. Run tests first with: pnpm test:e2e');
    process.exit(1);
  }

  const rawResults = JSON.parse(readFileSync(resultsPath, 'utf-8'));

  const report: CompatibilityReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
    browsers: {},
    devices: {
      desktop: ['chromium-desktop', 'firefox-desktop', 'webkit-desktop'],
      tablet: ['ipad', 'ipad-landscape'],
      mobile: ['iphone-12', 'iphone-se', 'pixel-5', 'galaxy-s9'],
    },
  };

  // Process test results
  for (const suite of rawResults.suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        for (const result of test.results || []) {
          const projectName = test.projectName || 'unknown';

          if (!report.browsers[projectName]) {
            report.browsers[projectName] = {
              passed: 0,
              failed: 0,
              tests: {},
            };
          }

          report.summary.total++;

          if (result.status === 'passed') {
            report.summary.passed++;
            report.browsers[projectName].passed++;
          } else if (result.status === 'failed') {
            report.summary.failed++;
            report.browsers[projectName].failed++;
          } else if (result.status === 'skipped') {
            report.summary.skipped++;
          }

          report.browsers[projectName].tests[spec.title] = {
            status: result.status,
            duration: result.duration,
            errors: result.errors?.map((e: any) => e.message),
          };
        }
      }
    }
  }

  // Generate markdown report
  const mdReport = generateMarkdownReport(report);

  // Save reports
  const reportDir = join(process.cwd(), 'test-results');
  writeFileSync(join(reportDir, 'compatibility-report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(reportDir, 'compatibility-report.md'), mdReport);

  console.log('\n✅ Compatibility report generated!');
  console.log(`📊 Results: ${report.summary.passed}/${report.summary.total} passed`);
  console.log(`📁 Reports saved to: ${reportDir}/`);
}

function generateMarkdownReport(report: CompatibilityReport): string {
  const passRate = ((report.summary.passed / report.summary.total) * 100).toFixed(1);

  let md = `# Calendar Application - Browser Compatibility Report\n\n`;
  md += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `- **Total Tests:** ${report.summary.total}\n`;
  md += `- **Passed:** ${report.summary.passed} ✅\n`;
  md += `- **Failed:** ${report.summary.failed} ❌\n`;
  md += `- **Skipped:** ${report.summary.skipped} ⏭️\n`;
  md += `- **Pass Rate:** ${passRate}%\n\n`;

  // Desktop Browsers
  md += `## Desktop Browsers\n\n`;
  md += `| Browser | Passed | Failed | Status |\n`;
  md += `|---------|--------|--------|--------|\n`;

  for (const device of report.devices.desktop) {
    if (report.browsers[device]) {
      const { passed, failed } = report.browsers[device];
      const status = failed === 0 ? '✅' : '❌';
      md += `| ${device} | ${passed} | ${failed} | ${status} |\n`;
    }
  }

  // Tablet Devices
  md += `\n## Tablet Devices\n\n`;
  md += `| Device | Passed | Failed | Status |\n`;
  md += `|---------|--------|--------|--------|\n`;

  for (const device of report.devices.tablet) {
    if (report.browsers[device]) {
      const { passed, failed } = report.browsers[device];
      const status = failed === 0 ? '✅' : '❌';
      md += `| ${device} | ${passed} | ${failed} | ${status} |\n`;
    }
  }

  // Mobile Devices
  md += `\n## Mobile Devices\n\n`;
  md += `| Device | Passed | Failed | Status |\n`;
  md += `|---------|--------|--------|--------|\n`;

  for (const device of report.devices.mobile) {
    if (report.browsers[device]) {
      const { passed, failed } = report.browsers[device];
      const status = failed === 0 ? '✅' : '❌';
      md += `| ${device} | ${passed} | ${failed} | ${status} |\n`;
    }
  }

  // Failed Tests Details
  const failedTests: Array<{ browser: string; test: string; errors: string[] }> = [];

  for (const [browser, data] of Object.entries(report.browsers)) {
    for (const [testName, result] of Object.entries(data.tests)) {
      if (result.status === 'failed' && result.errors) {
        failedTests.push({ browser, test: testName, errors: result.errors });
      }
    }
  }

  if (failedTests.length > 0) {
    md += `\n## Failed Tests Details\n\n`;

    for (const { browser, test, errors } of failedTests) {
      md += `### ${browser} - ${test}\n\n`;
      md += `\`\`\`\n${errors.join('\n')}\n\`\`\`\n\n`;
    }
  }

  // Recommendations
  md += `\n## Recommendations\n\n`;

  if (report.summary.failed === 0) {
    md += `✅ All tests passed! The calendar application is compatible across all tested browsers and devices.\n\n`;
  } else {
    md += `- Review failed tests above\n`;
    md += `- Check browser-specific CSS/JS issues\n`;
    md += `- Verify responsive breakpoints\n`;
    md += `- Test manually on actual devices\n\n`;
  }

  md += `## Screenshots\n\n`;
  md += `Screenshots saved to \`test-results/screenshots/\`:\n\n`;
  md += `- Desktop: 1920x1080, 1366x768\n`;
  md += `- Tablet: 768x1024, 1024x768\n`;
  md += `- Mobile: iPhone 12, iPhone SE, Android\n`;

  return md;
}

// Run the report generator
generateReport();
