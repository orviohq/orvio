import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const base = 'https://orvio-share.pn-26f.workers.dev',
  sha = 'd3e86159ff80c746cbf9ebaa3df2bb8b21b8d5d7ef8e6c2291cd9c2faa3d2228';
function job(hash = sha) {
  return {
    jobId: 'source-ui-fixture',
    status: 'done',
    title: 'Monkeys Spinning Monkeys',
    author: 'Kevin MacLeod',
    audio: {
      sha256: hash,
      sizeBytes: 24056664,
      contentType: 'audio/wav',
      durationSec: 125,
      contractVersion: 'audio/1',
      expiresAt: Date.now() + 86400000,
    },
  };
}
test('original main imports exact source and uses original clock, key input and pause', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  let posts = 0;
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: fs.readFileSync('public/wallpapers/first-light.png'),
    }),
  );
  await page.route(base + '/**', (route) => {
    if (route.request().method() === 'POST') posts++;
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers':
        'X-Content-SHA256,X-Source-Video-Id,X-Audio-Contract',
    };
    if (route.request().url().endsWith('/audio'))
      return route.fulfill({
        status: 200,
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
      status: 200,
      contentType: 'application/json',
      headers,
      body: JSON.stringify(job()),
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
  await expect(page.locator('#selected-title')).toHaveText(
    'Monkeys Spinning Monkeys',
  );
  await expect(page.locator('#selected-art')).toHaveCSS(
    'background-image',
    /i.ytimg.com/,
  );
  await page.screenshot({ path: 'test-results/a3-selection.png' });
  await page.click('[data-lanes="7"]');
  await page.click('[data-diff="high"]');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect(
    await page.evaluate(() =>
      document.body.style.getPropertyValue('--play-wallpaper'),
    ),
  ).toContain('i.ytimg.com');
  const d = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(d.total).toBe(538);
  expect(d.notes.some((s: any) => s.note.end !== undefined)).toBe(true);
  const n = d.notes.find((s: any) => s.note.time > 1).note;
  await page.waitForFunction(
    (t) => (window as any).orvioAudioTime >= t,
    n.time,
    { polling: 1 },
  );
  await page.keyboard.press(['s', 'd', 'f', 'Space', 'j', 'k', 'l'][n.lane]);
  const hit = await page.evaluate(
    (id) =>
      (window as any).orvioDiagnostics.events.find((e: any) => e.noteId === id),
    n.id,
  );
  expect(hit.value).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/original-youtube-playing.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.paused);
  const frozen = await page.evaluate(() => (window as any).orvioAudioTime);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).orvioAudioTime)).toBe(
    frozen,
  );
  expect(errors).toEqual([]);
  expect(posts).toBe(1);
});
