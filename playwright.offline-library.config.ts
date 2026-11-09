import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'library-first-paint-orv37.spec.ts',
  grep: /offline reload retains cached library and verified local playback/,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4183',
    locale: 'ko-KR',
    serviceWorkers: 'allow',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run preview -- --port 4183',
    url: 'http://127.0.0.1:4183',
    reuseExistingServer: false,
  },
});
