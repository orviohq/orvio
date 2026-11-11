import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'youtube-duplicate-orv98.spec.ts',
  outputDir: '/tmp/opencode/orv98/browser-proof',
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: process.env.ORV98_BASE_URL??'http://127.0.0.1:4198',
    locale: 'ko-KR',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'off',
    launchOptions: {
      executablePath: process.env.PW_EXECUTABLE_PATH,
      args: ['--enable-unsafe-swiftshader'],
    },
  },
  webServer: process.env.ORV98_BASE_URL?undefined:{
    command: 'PORT=4198 node test-support/static-fallback-server.mjs',
    url: 'http://127.0.0.1:4198/select/',
    reuseExistingServer: false,
  },
});
