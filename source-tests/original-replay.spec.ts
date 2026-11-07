import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
// An exact 8-second PCM excerpt tests original finish/results/local replay quickly.
// Full-length 125s PCM sync was checked separately; this is not that evidence.
const raw = fs.readFileSync('fixtures/audio1.wav');
let offset = 12,
  data = 0;
while (offset < raw.length) {
  const size = raw.readUInt32LE(offset + 4);
  if (raw.toString('ascii', offset, offset + 4) === 'data') {
    data = offset;
    break;
  }
  offset += 8 + size + (size % 2);
}
if (!data) throw Error('Missing PCM');
const bytes = Buffer.from(raw.subarray(0, data + 8 + 48000 * 4 * 8));
bytes.writeUInt32LE(bytes.length - 8, 4);
bytes.writeUInt32LE(48000 * 4 * 8, data + 4);
const sha = createHash('sha256').update(bytes).digest('hex');
test('original finish, saved source-bound replay, reload recovery and replay events agree on an 8s exact PCM excerpt', async ({
  page,
}) => {
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: fs.readFileSync('public/wallpapers/first-light.png'),
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  let posts = 0,
    network = 0;
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (route) => {
    network++;
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
        body: bytes,
      });
    return route.fulfill({
      contentType: 'application/json',
      headers,
      body: JSON.stringify({
        jobId: 'short-excerpt',
        status: 'done',
        title: 'Monkeys Spinning Monkeys',
        author: 'Kevin MacLeod',
        audio: {
          sha256: sha,
          sizeBytes: bytes.length,
          contentType: 'audio/wav',
          durationSec: 8,
          contractVersion: 'audio/1',
          expiresAt: Date.now() + 86400000,
        },
      }),
    });
  });
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill(
    '#youtube-url',
    'https://www.youtube.com/watch?v=uXn-zOt68V8',
  );
  await page.click('#youtube-submit');
  await expect(page.locator('#youtube-import')).not.toBeVisible();
  await page.click('[data-lanes="7"]');
  await page.click('[data-diff="high"]');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const note = await page.evaluate(
    () =>
      (window as any).orvioDiagnostics.notes.find((s: any) => s.note.time > 1)
        .note,
  );
  await page.waitForFunction(
    (t) => (window as any).orvioAudioTime >= t,
    note.time,
    { polling: 1 },
  );
  await page.keyboard.press(['s', 'd', 'f', 'Space', 'j', 'k', 'l'][note.lane]);
  await expect(page.locator('#results')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#result-art')).toHaveAttribute(
    'src',
    /i.ytimg.com/,
  );
  expect(
    await page
      .locator('#result-art')
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await expect(page.locator('#watch-replay')).toBeVisible();
  await expect(page.locator('#share-result')).toBeHidden();
  const original = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(original.events.some((e: any) => e.value > 0)).toBe(true);
  const score = await page.locator('#result-score').textContent();
  await page.screenshot({ path: 'test-results/original-youtube-result.png' });
  const count = network;
  await page.reload();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText(score!);
  await page.click('#watch-replay');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#results')).toBeVisible({ timeout: 15000 });
  const replay = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(replay.events).toEqual(original.events);
  await expect(page.locator('#result-score')).toHaveText(score!);
  expect(network).toBe(count);
  expect(posts).toBe(1);
  expect(errors).toEqual([]);
  await page.click('#back');
  await expect(page.locator('#local-replay')).toBeVisible();
  await page.click('#local-replay');
  await expect(page.locator('#results')).toBeVisible();
});
