import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const sha = 'd3e86159ff80c746cbf9ebaa3df2bb8b21b8d5d7ef8e6c2291cd9c2faa3d2228';
test('all six original main modes load exactly their pinned arrays and retain original options', async ({
  page,
}) => {
  let posts = 0;
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
        jobId: 'six-modes',
        status: 'done',
        title: 'Monkeys Spinning Monkeys',
        audio: {
          sha256: sha,
          sizeBytes: 24056664,
          durationSec: 125,
          contentType: 'audio/wav',
          contractVersion: 'audio/1',
          expiresAt: Date.now() + 86400000,
        },
      }),
    });
  });
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/uXn-zOt68V8');
  await page.keyboard.press('Enter');
  await expect(page.locator('#youtube-import')).not.toBeVisible();
  const charts = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('orvio.external-sources.v1');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return await new Promise<any>((resolve, reject) => {
      const r = db
        .transaction('records', 'readonly')
        .objectStore('records')
        .getAll();
      r.onsuccess = () => {
        db.close();
        resolve(r.result[0].record.charts);
      };
      r.onerror = () => reject(r.error);
    });
  });
  for (const lanes of [5, 7])
    for (const diff of ['low', 'mid', 'high']) {
      await page.click(`[data-lanes="${lanes}"]`);
      await page.click(`[data-diff="${diff}"]`);
      await page.click('#start');
      await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
      const actual = await page.evaluate(
        () => (window as any).orvioDiagnostics,
      );
      expect(actual.notes.map((s: any) => s.note)).toEqual(
        charts[`${lanes}:${diff}`].notes,
      );
      expect(actual.settings.lanes).toBe(lanes);
      expect(actual.settings.difficulty).toBe(diff);
      await page.keyboard.press('Escape');
      await page.click('#pause-exit');
    }
  expect(posts).toBe(1);
});
