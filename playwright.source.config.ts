import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './source-tests',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4196',
    launchOptions: {
      args: [
        '--autoplay-policy=no-user-gesture-required',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4196',
    url: 'http://127.0.0.1:4196',
    reuseExistingServer: false,
  },
});
