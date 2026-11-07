import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('original UI reads live sample job and WAV, pins original charts, plays, and restores locally without POSTing extraction', async ({
  page,
}) => {
  let realPosts = 0,
    jobGets = 0,
    audioGets = 0;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => {
    if (r.url().includes('/v1/audio-jobs/')) {
      if (r.url().endsWith('/audio')) audioGets++;
      else jobGets++;
    } else if (r.url().includes('/v1/audio-jobs') && r.method() === 'POST')
      realPosts++;
  });
  // Only the user's submit request is redirected to an existing read-only job.
  // Actual GET status/audio use the deployed backend, without response mocks.
  await page.route(
    'https://orvio-share.pn-26f.workers.dev/v1/audio-jobs',
    async (route) => {
      const r = await page.request.get(
        'https://orvio-share.pn-26f.workers.dev/v1/audio-jobs/d02daad1-1efc-4a09-a67c-cfc2578131b7',
      );
      expect(r.status()).toBe(200);
      const data = await r.json();
      expect(data.title).toBe('Monkeys Spinning Monkeys');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(data),
      });
    },
  );
  await page.route('https://orvio-play.pages.dev/**', async (route) => {
    const url = new URL(route.request().url());
    const local = await page.request.get(
      'http://127.0.0.1:4196' + url.pathname + url.search,
    );
    await route.fulfill({ response: local });
  });
  await page.goto('https://orvio-play.pages.dev/select/');
  await page.click('#add-youtube');
  await page.fill(
    '#youtube-url',
    'https://www.youtube.com/watch?v=uXn-zOt68V8',
  );
  await page.click('#youtube-submit');
  await expect(page.locator('#youtube-import')).not.toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator('#selected-title')).toHaveText(
    'Monkeys Spinning Monkeys',
  );
  await expect(page.locator('#selected-subtitle')).toHaveText(
    'Kevin MacLeod (incompetech.com)',
  );
  await page.click('[data-lanes="7"]');
  await page.click('[data-diff="high"]');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const first = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(first.total).toBe(250);
  const n = first.notes.find((s: any) => s.note.time > 1).note;
  await page.waitForFunction(
    (t) => (window as any).orvioAudioTime >= t,
    n.time,
    { polling: 1 },
  );
  await page.keyboard.press(['s', 'd', 'f', 'Space', 'j', 'k', 'l'][n.lane]);
  await page.screenshot({ path: 'test-results/original-live-playing.png' });
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  const counts = { jobGets, audioGets };
  await page.reload();
  await expect(page.locator('#selected-title')).toHaveText(
    'Monkeys Spinning Monkeys',
  );
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const second = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(second.notes.map((s: any) => s.note)).toEqual(
    first.notes.map((s: any) => s.note),
  );
  expect({ jobGets, audioGets }).toEqual(counts);
  expect(errors).toEqual([]);
  fs.writeFileSync(
    'test-results/original-live.json',
    JSON.stringify(
      {
        redirectedSubmit: realPosts,
        actualNetworkPost: 0,
        jobGets,
        audioGets,
        first,
        second,
      },
      null,
      2,
    ),
  );
});
