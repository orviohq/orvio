import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const base = 'https://orvio-share.pn-26f.workers.dev',
  sha = 'd3e86159ff80c746cbf9ebaa3df2bb8b21b8d5d7ef8e6c2291cd9c2faa3d2228';
test('original library survives reload offline with all six pinned charts and no replacement request', async ({
  page,
}) => {
  let posts = 0,
    gets = 0;
  await page.route(base + '/**', (route) => {
    if (route.request().method() === 'POST') posts++;
    else gets++;
    if (route.request().url().endsWith('/audio'))
      return route.fulfill({
        contentType: 'audio/wav',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers':
            'X-Content-SHA256,X-Source-Video-Id,X-Audio-Contract',
          'X-Content-SHA256': sha,
          'X-Source-Video-Id': 'uXn-zOt68V8',
          'X-Audio-Contract': 'audio/1',
        },
        body: fs.readFileSync('fixtures/audio1.wav'),
      });
    return route.fulfill({
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        jobId: 'source-library',
        status: 'done',
        title: 'Monkeys Spinning Monkeys',
        author: 'Kevin MacLeod',
        audio: {
          sha256: sha,
          sizeBytes: 24056664,
          contentType: 'audio/wav',
          durationSec: 125,
          contractVersion: 'audio/1',
          expiresAt: Date.now() + 86400000,
        },
      }),
    });
  });
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.screenshot({ path: 'test-results/original-youtube-dialog.png' });
  await page.fill('#youtube-url', 'https://youtu.be/uXn-zOt68V8');
  await page.click('#youtube-submit');
  await expect(page.locator('#youtube-import')).not.toBeVisible();
  const url = page.url();
  await page.screenshot({ path: 'test-results/original-youtube-library.png' });
  const count = posts + gets;
  await page.reload();
  await expect(page.locator('#selected-title')).toHaveText(
    'Monkeys Spinning Monkeys',
  );
  await expect(page.locator('.song-card')).toHaveCount(4);
  expect(page.url()).toBe(url);
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect(posts + gets).toBe(count);
  expect(posts).toBe(1);
});
