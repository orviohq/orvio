import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  // These specs route/fetch through a dev server on 127.0.0.1:4207
  // (metadata-apt-live directly; shared-result-title-a38 as its local origin).
  testMatch: ['metadata-apt-live.spec.ts', 'shared-result-title-a38.spec.ts'],
  workers: 1,
  timeout: 60000,
  use: {
    locale: 'ko-KR',
    baseURL: 'http://127.0.0.1:4207',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4207',
    url: 'http://127.0.0.1:4207',
    reuseExistingServer: false,
  },
});
