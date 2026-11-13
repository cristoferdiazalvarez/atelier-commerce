import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
const baseURL = process.env.APP_URL || 'http://localhost:3000';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 2,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chrome' },
    },
  ],
  webServer: {
    command: `npm run ${process.env.E2E_PRODUCTION === 'true' ? 'start' : 'dev'} -- --port ${new URL(baseURL).port || 3000}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
