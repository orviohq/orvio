import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'a29-share-dialogs.spec.ts',
  timeout: 60000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4198',
    locale: 'ko-KR',
    channel: 'chrome',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'PORT=4198 node test-support/static-fallback-server.mjs',
    url: 'http://127.0.0.1:4198/result/',
    reuseExistingServer: false,
  },
});
