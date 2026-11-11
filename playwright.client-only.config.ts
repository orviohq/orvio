import { defineConfig } from '@playwright/test';

const executablePath = process.env.PW_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'client-only-production.spec.ts',
    'direct-youtube-production.spec.ts',
  ],
  workers: 1,
  retries: 0,
  timeout: 90000,
  reporter: [['list']],
  use: {
    baseURL: process.env.ORV96_BASE_URL ?? 'http://127.0.0.1:4192',
    locale: 'ko-KR',
    serviceWorkers: process.env.ORV96_FULL_OFFLINE ? 'allow' : 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: process.env.ORV96_BASE_URL
    ? undefined
    : {
        command: 'PORT=4192 node test-support/static-fallback-server.mjs',
        url: 'http://127.0.0.1:4192/select/',
        reuseExistingServer: false,
      },
});
