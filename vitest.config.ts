import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    env: { PUBLIC_YOUTUBE_API_ORIGIN: 'https://provider.fixture.invalid' },
    include: ['tests/**/*.test.ts'],
    // Immutable owner20 suite uses node:test; npm test runs it separately.
    exclude: [
      'tests/youtube-direct-api.test.ts',
      'tests/direct-local-allkeys-store.test.ts',
      'tests/direct-local-allkeys-worker.test.ts',
      'tests/youtube-origin-config.test.ts',
      'tests/gatea-95s-repro.test.ts',
      'tests/gatea-edge.test.ts',
      'tests/gatea-progress.test.ts',
    ],
  },
});
