import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './safari-tests',
  workers: 1,
  timeout: 60000,
  use: {
    browserName: 'webkit',
    baseURL: 'http://127.0.0.1:4217',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    launchOptions: { executablePath: process.env.ORVIO_WEBKIT_EXECUTABLE },
  },
  webServer: {
    command: 'npm run dev -- --port 4217',
    url: 'http://127.0.0.1:4217',
    reuseExistingServer: false,
  },
});
