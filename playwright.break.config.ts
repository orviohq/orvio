import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'break-visibility.spec.ts',
    'public-notes-copy.spec.ts',
    'patch-font.spec.ts',
  ],
  workers: 1,
  timeout: 110000,
  use: {
    baseURL: 'http://127.0.0.1:4214',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4214',
    url: 'http://127.0.0.1:4214',
    reuseExistingServer: false,
  },
});
