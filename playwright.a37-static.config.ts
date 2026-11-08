import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'external-play-fallback-static-a37.spec.ts',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4198',
    locale: 'ko-KR',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'node test-support/static-fallback-server.mjs',
    url: 'http://127.0.0.1:4198/select/',
    reuseExistingServer: false,
  },
});
