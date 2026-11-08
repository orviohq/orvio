import { AUDIO_BASE } from '../src/external-audio-api';
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
test('explicit regeneration keeps legacy pin and replay while adding a separate version', async ({
  page,
}) => {
  test.setTimeout(120000);
  const oldProvider = fs.readFileSync(
    'source-tests/fixtures/legacy-provider-browser.js',
    'utf8',
  );
  await page.route('**/src/external-source-provider.ts', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: oldProvider }),
  );

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
  await page.route(AUDIO_BASE + '/**', (route) => {
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
  const oldPin = await page.evaluate(async () => {
    const { listPinnedSources } = await import('/src/external-source-store.ts');
    return (await listPinnedSources('uXn-zOt68V8'))[0];
  });
  expect(oldPin.analyzerVersion).toBe('tuned-2026-11-07');
  await page.unroute('**/src/external-source-provider.ts');
  const score = await page.locator('#result-score').textContent();
  await page.screenshot({ path: 'test-results/original-youtube-result.png' });
  const count = network;
  await page.reload();
  await expect(page.locator('#results')).toBeVisible();
  const newPin = await page.evaluate(async () => {
    const { listPinnedSources } = await import('/src/external-source-store.ts');
    return (await listPinnedSources('uXn-zOt68V8'))[0];
  });
  expect(newPin).toEqual(oldPin);
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
  await page.click('#back');
  await page.click('#regenerate-chart');
  await expect(page.locator('#regenerate-chart')).toBeEnabled();
  const versions = await page.evaluate(async () => {
    const { listPinnedSources, readPinnedSource } =
      await import('/src/external-source-store.ts');
    const { sourceId } = await import('/src/external-catalog.ts');
    const { localMetadata, localAudio } =
      await import('/src/external-local.ts');
    const records = await listPinnedSources('uXn-zOt68V8');
    return await Promise.all(
      records.map(async (r) => ({
        record: r,
        id: sourceId(r),
        meta: await localMetadata(r),
        hasAudio: !!(await localAudio(r)),
        read: await readPinnedSource(
          r.videoId,
          r.audioSha256,
          r.chartSetSha256,
        ),
      })),
    );
  });
  expect(versions).toHaveLength(2);
  expect(versions[0].record).toEqual(oldPin);
  expect(versions[0].read).toEqual(oldPin);
  expect(versions[0].meta.latestSession).toBeTruthy();
  expect(versions[1].meta.latestSession).toBeUndefined();
  expect(versions[1].record.chartSetSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(versions[1].id).not.toBe(versions[0].id);
  expect(versions[1].read).toEqual(versions[1].record);
  expect(versions.every((v) => v.hasAudio)).toBe(true);
  expect(versions[1].record.charts['7:high'].notes).not.toEqual(
    oldPin.charts['7:high'].notes,
  );
  expect(network).toBe(count);
  await expect(page.locator('#local-replay')).toBeHidden();
  await expect(page.locator('.song-card')).toHaveCount(5);
  await page.screenshot({
    path: 'test-results/version-regeneration-select.png',
  });
  for (const [width, height] of [
    [1280, 720],
    [1366, 600],
    [1280, 480],
  ]) {
    await page.setViewportSize({ width, height });
    for (const l of [
      'en',
      'ko',
      'zh',
      'ja',
      'es',
      'fr',
      'de',
      'pt',
      'it',
      'ru',
      'id',
      'tr',
      'vi',
    ]) {
      await page.evaluate((lang) => {
        Object.defineProperty(navigator, 'languages', {
          get: () => [lang],
          configurable: true,
        });
        window.dispatchEvent(new Event('languagechange'));
      }, l);
      await page.evaluate(() => document.fonts.ready);
      for (const id of [
        '#start',
        '#open-game-options',
        '#add-youtube',
        '#regenerate-chart',
      ]) {
        const bounds = await page.locator(id).evaluate((e) => {
          const r = e.getBoundingClientRect();
          const hit = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return {
            top: r.top,
            bottom: r.bottom,
            right: r.right,
            width: innerWidth,
            height: innerHeight,
            hit: !!hit && (hit === e || e.contains(hit)),
          };
        });
        expect(bounds.top).toBeGreaterThanOrEqual(0);
        expect(bounds.bottom).toBeLessThanOrEqual(height);
        expect(bounds.right).toBeLessThanOrEqual(width);
        expect(bounds.hit).toBe(true);
      }
      const footer = await page.locator('.footer-strip').boundingBox();
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(height);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/regen-${l}-${width}-${height}.png`,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en'],
      configurable: true,
    });
    window.dispatchEvent(new Event('languagechange'));
  });
  // Same analysis is idempotent, not an ever-growing library.
  await page.click('#regenerate-chart');
  await expect(page.locator('#regenerate-chart')).toBeEnabled();
  await expect(page.locator('.song-card')).toHaveCount(5);
  await page.reload();
  await expect(page.locator('.song-card')).toHaveCount(5);
  await page.locator('[data-song="3"]').click();
  await expect(page.locator('#local-replay')).toBeVisible();
  await page.click('#local-replay');
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText(score!);
  await page.click('#watch-replay');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#results')).toBeVisible({ timeout: 15000 });
  expect(
    (await page.evaluate(() => (window as any).orvioDiagnostics)).events,
  ).toEqual(original.events);
  expect(network).toBe(count);
  expect(posts).toBe(1);
  expect(errors).toEqual([]);
});
