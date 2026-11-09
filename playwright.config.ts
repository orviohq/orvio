import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  // Specs owned by dedicated configs (static/progressive servers or fixed
  // ports other than 4173) run in their own ci.yml steps, not here. Every
  // entry below is matched by a dedicated-config step in .github/workflows/ci.yml;
  // removing a step without removing its entry silently drops coverage.
  testIgnore: [
    /external-play-fallback-static-a37\.spec\.ts$/,
    /library-first-paint-orv37\.spec\.ts$/,
    /library-toolbar-orv64\.spec\.ts$/,
    /failed-import-layout-orv65\.spec\.ts$/,
    /loading-library-orv68\.spec\.ts$/,
    /client-generation-orv69\.spec\.ts$/,
    /local-shared-browser-orv69\.spec\.ts$/,
    /library-return-orv71\.spec\.ts$/,
    /replay-first-paint-orv72\.spec\.ts$/,
    /error-library-orv73\.spec\.ts$/,
    /progressive-playback\.spec\.ts$/,
    /result-projection-parity-orv62\.spec\.ts$/,
    /result-cache-static-orv62\.spec\.ts$/,
    /metadata-apt-live\.spec\.ts$/,
    /shared-result-title-a38\.spec\.ts$/,
  ],
  workers: 1,
  timeout: 60000,
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ko-KR',
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
