import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'progressive-playback.spec.ts',
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:4199',
    locale: 'ko-KR',
    serviceWorkers: 'block',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'node test-support/progressive-server.mjs',
    url: 'http://127.0.0.1:4199/select/',
    reuseExistingServer: false,
  },
});
