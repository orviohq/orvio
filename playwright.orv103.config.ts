import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'orv103-result-share.spec.ts',
  outputDir: 'qa-evidence/orv103/artifacts',
  reporter: [['list'], ['json', { outputFile: 'qa-evidence/orv103/report.json' }]],
  workers: 1,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4313',
    locale: 'ko-KR',
    serviceWorkers: 'block',
    launchOptions: {
      executablePath: '/usr/bin/google-chrome',
      args: ['--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'PORT=4313 node test-support/static-fallback-server.mjs',
    url: 'http://127.0.0.1:4313/select/',
    reuseExistingServer: false,
  },
});
