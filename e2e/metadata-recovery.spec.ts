import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test('metadata fresh and existing cached recovery preserves identities and audio', async ({
  page,
}) => {
  const fixture = JSON.parse(
    fs.readFileSync('e2e/fixtures/v027-synthetic-fixture.json', 'utf8'),
  );
  const audio = Buffer.from(fixture.bytes);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const mode = process.env.METADATA_CASE || 'existing';
  let enabled = mode === 'fresh';
  let metadataStatus = 200;
  let wrongBinding = false;
  const requests: string[] = [];
  await page.route(
    'https://orvio-share.pn-26f.workers.dev/**',
    async (route) => {
      const u = route.request().url();
      requests.push(route.request().method() + ' ' + u);
      if (route.request().method() !== 'GET') throw Error('No extraction');
      const r = fixture.records[0];
      if (u.endsWith('/metadata'))
        return route.fulfill({
          status: enabled ? metadataStatus : 404,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            videoId: r.id,
            title: 'Recovered Song <text>',
            author: mode === 'titleonly' ? null : 'Recovered Artist',
            durationSec: 1,
            audioSha256: wrongBinding ? '0'.repeat(64) : fixture.sha,
            chartSetSha256: r.chartSet,
            source: 'audio-manifest',
          }),
        });
      if (u.endsWith('/audio'))
        return route.fulfill({
          body: audio,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': '*',
            'Content-Type': 'audio/wav',
            'Content-Length': String(audio.length),
            'X-Content-SHA256': fixture.sha,
            'X-Canonical-Audio-SHA256': fixture.sha,
            'X-Source-Video-Id': r.id,
            'X-Audio-Contract': 'audio/1',
          },
        });
      return route.fulfill({
        body: r.raw,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': '*',
          'Content-Type': 'application/json',
          'X-SourceRecord-SHA256': r.rawSha,
          'X-ChartSet-SHA256': r.chartSet,
          'X-Canonical-Audio-SHA256': fixture.sha,
          'X-Canonical-Audio-Cached': 'true',
        },
      });
    },
  );
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/AAAAAAAAAAA');
  await page.click('#youtube-submit');
  await expect(page.locator('[data-import-video="AAAAAAAAAAA"]')).toHaveCount(
    0,
  );
  await expect(page.locator('#songs')).toContainText(
    mode === 'fresh' ? 'Recovered Song <text>' : 'AAAAAAAAAAA',
  );
  await expect
    .poll(() => requests.filter((x) => x.endsWith('/metadata')).length)
    .toBe(1);
  if (mode === 'existing') {
    await page.locator('#songs>[data-song]').first().click();
    await page.click('#start');
    await expect(page.locator('#results')).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Escape');
  }
  const snapshot = () =>
    page.evaluate(async () => {
      const { allPinnedSources } = await import(
        /* @vite-ignore */ String('/src/external-source-store.ts')
      );
      const { localAudio } = await import(
        /* @vite-ignore */ String('/src/external-local.ts')
      );
      const all = await allPinnedSources();
      const record = all.find(
        (r: { videoId: string }) => r.videoId === 'AAAAAAAAAAA',
      )!;
      const local = await localAudio(record);
      const bytes = [...new Uint8Array(local!.bytes)];
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('orvio.external-library.v1', 2);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const sessions = await new Promise<any[]>((resolve, reject) => {
        const r = db
          .transaction('sessions', 'readonly')
          .objectStore('sessions')
          .getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return {
        record: JSON.stringify(record),
        bytes,
        sessions: JSON.stringify(sessions),
      };
    });
  if (mode === 'titleonly')
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('orvio.external-library.v1', 2);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['audio', 'metadata'], 'readwrite');
        for (const name of ['audio', 'metadata']) {
          const store = tx.objectStore(name);
          const request = store.getAll();
          request.onsuccess = () => {
            for (const row of request.result)
              store.put({ ...row, author: 'Known Artist' });
          };
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
  const before = await snapshot();
  if (mode === 'existing') expect(JSON.parse(before.sessions)).toHaveLength(1);
  enabled = true;
  if (mode === 'wrong') wrongBinding = true;
  if (mode === 'outage') metadataStatus = 503;
  requests.length = 0;
  await page.reload();
  if (mode === 'wrong' || mode === 'outage') {
    await page.waitForTimeout(500);
    await expect(page.locator('#songs')).toContainText('AAAAAAAAAAA');
    expect(await snapshot()).toEqual(before);
    expect(errors).toEqual([]);
    expect(requests.every((x) => x.endsWith('/metadata'))).toBe(true);
    return;
  }
  await expect(page.locator('#songs')).toContainText('Recovered Song <text>');
  await expect(page.locator('#songs')).toContainText(
    mode === 'titleonly' ? 'Known Artist' : 'Recovered Artist',
  );
  expect(await snapshot()).toEqual(before);
  expect(requests.filter((x) => x.includes('/audio'))).toEqual([]);
  await page.locator('#songs>[data-song]').first().click();
  await expect(page.locator('#selected-title')).toContainText(
    'Recovered Song <text>',
  );
  await page.screenshot({
    path: test.info().outputPath('metadata-existing-recovered.png'),
  });
  await page.reload();
  await expect(page.locator('#songs')).toContainText('Recovered Song <text>');
  expect(await snapshot()).toEqual(before);
  expect(errors).toEqual([]);
});
