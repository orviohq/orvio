import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('saved YouTube source starts from the built offline app without a new job', async ({
  page,
  context,
}) => {
  let posts = 0;
  const sha =
    'd3e86159ff80c746cbf9ebaa3df2bb8b21b8d5d7ef8e6c2291cd9c2faa3d2228';
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (route) => {
    if (route.request().method() === 'POST') posts++;
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers':
        'X-Content-SHA256,X-Source-Video-Id,X-Audio-Contract',
    };
    if (route.request().url().endsWith('/audio'))
      return route.fulfill({
        contentType: 'audio/wav',
        headers: {
          ...headers,
          'X-Content-SHA256': sha,
          'X-Source-Video-Id': 'uXn-zOt68V8',
          'X-Audio-Contract': 'audio/1',
        },
        body: fs.readFileSync('fixtures/audio1.wav'),
      });
    return route.fulfill({
      contentType: 'application/json',
      headers,
      body: JSON.stringify({
        jobId: 'offline-library',
        status: 'done',
        title: 'Monkeys Spinning Monkeys',
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
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/uXn-zOt68V8');
  await page.click('#youtube-submit');
  await expect(page.locator('#youtube-import')).not.toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(page.locator('#selected-title')).toHaveText(
    'Monkeys Spinning Monkeys',
  );
  await context.setOffline(true);
  await page.goto(url);
  await expect(page.locator('#selected-title')).toHaveText(
    'Monkeys Spinning Monkeys',
  );
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect(posts).toBe(1);
  expect(
    (await page.evaluate(() => (window as any).orvioDiagnostics)).total,
  ).toBe(137);
});
