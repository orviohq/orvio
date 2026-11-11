import { defineConfig } from '@playwright/test';

// Isolated local production build only. Build before running this config.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'orv94-fever-output.spec.ts',
  timeout: 120000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.ORV94_BASE_URL??'http://127.0.0.1:4194',
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
  webServer: process.env.ORV94_BASE_URL?undefined:{
    command: 'npm run preview -- --port 4194',
    url: 'http://127.0.0.1:4194',
    reuseExistingServer: false,
  },
});
