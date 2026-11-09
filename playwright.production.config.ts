import { defineConfig } from '@playwright/test';

// Production smoke runs ONLY specs verified against the deployed static public
// build with the current 0.2.50 UI contract (keycap-driven input, builtin
// results, replay, result layout, mobile browsing). Everything else in e2e/
// stays owned by its dev-server / backend / static-fallback config and is NOT
// deleted: specs importing ../src modules or /src/ vite paths, specs reading
// host-local fixture files, worker/backend-route specs, and specs asserting
// superseded UI contracts (per-lane key-binding UI, #ready-screen after
// refresh) must not run against the public deployment - they false-flag it.
// Default-deny: a new e2e spec is NOT picked up here until verified against
// the deployed build; add it deliberately after checking context.
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  workers: 1,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    locale: 'ko-KR',
    baseURL: 'https://orvio-play.pages.dev/',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  projects: [
    {
      name: 'smoke',
      // Current-contract static-public checks: real keyboard gameplay
      // (incl. MAX100 + integer lane widths), local replay sharing with exact
      // judgments, and result-card layout/options/motion.
      testMatch: [
        'patch.spec.ts',
        'replay.spec.ts',
        'result-entry.spec.ts',
        'result-focus.spec.ts',
        'result-options.spec.ts',
        'result-card-height-orv60.spec.ts',
        'result-motion-orv59.spec.ts',
        // Current-contract coverage for public keyboard modes, the refreshed
        // play-route gate contract, and settings/options persistence.
        'a29-allmodes.spec.ts',
        'refresh-direct-start-a37.spec.ts',
        'production-settings-050.spec.ts',
      ],
    },
    {
      name: 'mobile',
      // play.spec's other test asserts the removed key-binding settings UI;
      // only the current-contract mobile browsing check runs in production.
      testMatch: ['play.spec.ts'],
      grep: /mobile layout is browse-only/,
    },
  ],
});
