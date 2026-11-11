import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "key-switch-audio-continuity-orv80.spec.ts",
  outputDir: "./qa-evidence/orv80-playwright",
  workers: 1,
  retries: 0,
  timeout: 180000,
  expect: { timeout: 30000 },
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4188",
    locale: "en-US",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 4188",
    // Keep Astro attached to the process owned and stopped by Playwright.
    env: { ASTRO_DEV_BACKGROUND: "1" },
    url: "http://127.0.0.1:4188/select/",
    reuseExistingServer: false,
    timeout: 180000,
  },
});
