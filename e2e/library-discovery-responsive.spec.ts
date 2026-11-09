import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const record = JSON.parse(
  fs.readFileSync('test-support/opus35-frost/record.json', 'utf8'),
);
async function seed(page: any, corrupt: boolean, noSc = false) {
  await page.goto('/404/');
  await page.evaluate(
    async ({ record, corrupt, noSc }: any) => {
      if (noSc) {
        delete record.charts['5:sc'];
        delete record.charts['7:sc'];
        delete record.chartMetadata['5:sc'];
        delete record.chartMetadata['7:sc'];
        const keys = ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'];
        const digest = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(
            JSON.stringify({
              analyzer: record.analyzerVersion,
              config: record.config,
              charts: keys.map((key) => [key, record.charts[key].sha256]),
              chartMetadata: record.chartMetadata,
            }),
          ),
        );
        record.chartSetSha256 = Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('');
      }
      if (corrupt) record.charts['5:low'].notes[0].time += 0.01;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('orvio.opus35-library.v1', 1);
        r.onupgradeneeded = () => {
          r.result.createObjectStore('metadata', { keyPath: 'key' });
          r.result.createObjectStore('sessions', { keyPath: 'key' });
        };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('metadata', 'readwrite');
        tx.objectStore('metadata').put({
          kind: 'opus35-source',
          key: `yt-opus35-${record.videoId}-${record.audioDescriptorSha256}-c${record.chartSetSha256}`,
          record,
          title: 'Discovery fixture',
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { record, corrupt, noSc },
  );
  await page.goto('/select/');
  await page.waitForSelector('#songs [data-song]');
  await page.waitForFunction(
    () => !document.documentElement.dataset.libraryHydrating,
  );
}
test('verified full discovery row appears and keeps actual selection interactive', async ({
  page,
}) => {
  await seed(page, false);
  const row = page
    .locator('#songs [data-song]')
    .filter({ hasText: 'Discovery fixture' });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.locator('#selected-title')).toHaveText('Discovery fixture');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#selected-title')).not.toHaveText(
    'Discovery fixture',
  );
});
test('tampered pinned notes fail integrity before a selectable or playable row exists', async ({
  page,
}) => {
  await seed(page, true);
  await expect(
    page.locator('#songs [data-song]').filter({ hasText: 'Discovery fixture' }),
  ).toHaveCount(0);
  await expect(page.locator('#songs [data-song]')).toHaveCount(3);
});

test('SC to saved external without SC updates all row metrics to normalized HIGH', async ({
  page,
}) => {
  await seed(page, false, true);
  await page
    .locator('#songs [data-song]')
    .filter({ hasText: 'First Light' })
    .click();
  await page.locator('[data-diff="sc"]').click();
  await expect(page.locator('[data-diff="sc"]')).toHaveClass(/selected/);
  const external = page
    .locator('#songs [data-song]')
    .filter({ hasText: 'Discovery fixture' });
  await expect(external.locator('.song-note-count')).toContainText('--');
  await external.click();
  await expect(page.locator('[data-diff="high"]')).toHaveClass(/selected/);
  await expect(external.locator('.song-note-count')).toContainText(
    String(record.charts['5:high'].notes.length),
  );
  await expect(external.locator('.song-level')).toHaveText(/^MX /);
});
test('actual streaming callbacks replace a selected older pin with visible final peer, including old-id route', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = class extends Native {
      set onmessage(handler: any) {
        let count = 0;
        super.onmessage = (event: any) => {
          const delay =
            event.data?.kind === 'row' ? (++count === 1 ? 0 : 700) : 700;
          setTimeout(() => handler?.(event), delay);
        };
      }
    } as any;
  });
  await page.goto('/404/');
  const oldId = await page.evaluate(async (record: any) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('orvio.opus35-library.v1', 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('metadata', { keyPath: 'key' });
        r.result.createObjectStore('sessions', { keyPath: 'key' });
      };
      r.onsuccess = () => resolve(r.result);
    });
    const key = (r: any) =>
      `yt-opus35-${r.videoId}-${r.audioDescriptorSha256}-c${r.chartSetSha256}`;
    const older = structuredClone(record),
      newer = structuredClone(record);
    older.audioDescriptorSha256 = '0'.repeat(64);
    newer.audioDescriptorSha256 = 'f'.repeat(64);
    await new Promise<void>((resolve) => {
      const tx = db.transaction('metadata', 'readwrite'),
        s = tx.objectStore('metadata');
      for (const [r, title] of [
        [older, 'Older pin'],
        [newer, 'Final preferred pin'],
      ] as const)
        s.put({ kind: 'opus35-source', key: key(r), record: r, title });
      tx.oncomplete = () => resolve();
    });
    db.close();
    return key(older);
  }, record);
  for (const url of [
    '/select/',
    '/select/?song=' + encodeURIComponent(oldId),
  ]) {
    await page.goto(url);
    const older = page
      .locator('#songs [data-song]')
      .filter({ hasText: 'Older pin' });
    await expect(older).toBeVisible();
    await older.click();
    await expect(page.locator('#selected-title')).toHaveText('Older pin');
    await page.waitForFunction(
      () => !document.documentElement.dataset.libraryHydrating,
    );
    await expect(older).toHaveCount(0);
    await expect(page.locator('#selected-title')).toHaveText(
      'Final preferred pin',
    );
    await expect(page.locator('#songs [data-song].selected')).toContainText(
      'Final preferred pin',
    );
    await expect(page.locator('#songs [data-song]')).toHaveCount(4);
  }
});
