import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'skin-pixel-parity.spec.ts',
    'combined-layout.spec.ts',
    'import-progress.spec.ts',
    'sonner.spec.ts',
    'song-share.spec.ts',
    'break-visibility.spec.ts',
  ],
  workers: 2,
  timeout: 115000,
  outputDir: '/downloads/combined-browser-results',
  use: {
    locale: 'ko-KR',
    baseURL: 'http://127.0.0.1:4233',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4233',
    url: 'http://127.0.0.1:4233',
    reuseExistingServer: false,
  },
});
