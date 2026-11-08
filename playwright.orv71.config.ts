import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'library-return-orv71.spec.ts',
  workers: 1,
  timeout: 20000,
  use: { baseURL: process.env.ORV71_BASE || 'http://127.0.0.1:4198' },
  webServer: process.env.ORV71_BASE
    ? undefined
    : {
        command: 'node test-support/static-fallback-server.mjs',
        url: 'http://127.0.0.1:4198/select/',
        reuseExistingServer: false,
      },
});
