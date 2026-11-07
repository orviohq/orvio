import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './pwa-tests',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run preview -- --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI,
  },
});
