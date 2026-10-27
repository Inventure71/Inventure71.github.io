import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.js',
  workers: 1,
  timeout: 45_000,
  outputDir: 'output/playwright',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4317',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-test-site.mjs',
    url: 'http://127.0.0.1:4317',
    reuseExistingServer: false,
  },
});
