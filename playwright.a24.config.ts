import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  // The orv69 fresh-browser spec navigates to 127.0.0.1:4197 directly.
  testMatch: ['local-shared-browser-orv69.spec.ts'],
  workers: 1,
  timeout: 60000,
  use: {
    locale: 'ko-KR',
    baseURL: 'http://127.0.0.1:4197',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4197',
    url: 'http://127.0.0.1:4197',
    reuseExistingServer: false,
  },
});
