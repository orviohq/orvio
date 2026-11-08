import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'result-projection-parity-orv62.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4198' },
  webServer: {
    command: 'node test-support/static-fallback-server.mjs',
    url: 'http://127.0.0.1:4198/select/',
    reuseExistingServer: false,
  },
});
