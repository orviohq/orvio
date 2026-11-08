import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'failed-import-layout-orv65.spec.ts',
  workers: 2,
  timeout: 45000,
  use: { baseURL: process.env.ORV65_BASE || 'http://127.0.0.1:4198' },
  webServer: process.env.ORV65_BASE
    ? undefined
    : {
        command: 'node test-support/static-fallback-server.mjs',
        url: 'http://127.0.0.1:4198/select/',
        reuseExistingServer: false,
      },
});
