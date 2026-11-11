import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "status-localization-orv93.spec.ts",
  outputDir: "./qa-evidence/orv93-playwright",
  reporter: [
    ["list"],
    ["json", { outputFile: "./qa-evidence/orv93-results.json" }],
  ],
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    browserName: "chromium", channel:"chrome",
    baseURL:process.env.ORV93_BASE_URL??"http://127.0.0.1:4193",
    locale: "en-US",
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer:process.env.ORV93_BASE_URL?undefined:{
    command: "npm run dev -- --port 4193",
    // Keep Astro in the foreground so Playwright owns its full lifetime.
    env: { ASTRO_DEV_BACKGROUND: "1", ASTRO_TELEMETRY_DISABLED: "1" },
    url: "http://127.0.0.1:4193/status/",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
