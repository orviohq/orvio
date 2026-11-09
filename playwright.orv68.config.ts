import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  // Sibling dedicated configs own the other static library specs; run each once in CI.
  testMatch: 'loading-library-orv68.spec.ts',
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: process.env.ORV68_BASE || 'http://127.0.0.1:4198',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: process.env.ORV68_BASE
    ? undefined
    : {
        command: 'node test-support/static-fallback-server.mjs',
        url: 'http://127.0.0.1:4198/select/',
        reuseExistingServer: false,
      },
});
