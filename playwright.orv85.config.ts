import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'orv85-*.spec.ts',
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: 'http://127.0.0.1:4301',
    locale: 'ko-KR',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [
    { name: 'orv85-diagnostic', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
  webServer: {
    command: 'npx astro dev --port 4301 --host 127.0.0.1 --ignore-lock',
    url: 'http://127.0.0.1:4301',
    reuseExistingServer: true,
  },
});
