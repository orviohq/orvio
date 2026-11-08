import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './safari-tests',
  workers: 1,
  timeout: 60000,
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4227',
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4227',
    url: 'http://127.0.0.1:4227',
    reuseExistingServer: false,
  },
});
