import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'orv106-copy.spec.ts',
  outputDir: '.orv106-evidence/artifacts',
  reporter: [['list'], ['json', { outputFile: '.orv106-evidence/report.json' }]],
  workers: 1,
  timeout: 20000,
  use: {
    baseURL: 'http://127.0.0.1:4316',
    browserName: 'chromium',
    locale: 'en-US',
    serviceWorkers: 'block',
    launchOptions: { executablePath: '/usr/bin/google-chrome' },
  },
  webServer: {
    command: 'PORT=4316 node test-support/static-fallback-server.mjs',
    url: 'http://127.0.0.1:4316/select/',
    reuseExistingServer: true,
  },
});
