import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'library-first-paint-orv37.spec.ts',
  // SW-ready/offline case needs built production PWA registration, not this dev-like static host.
  grepInvert:
    /offline reload retains cached library and verified local playback/,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4198',
    locale: 'ko-KR',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    video: 'on',
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
