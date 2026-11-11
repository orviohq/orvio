import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fixture = JSON.parse(readFileSync('a37-external-fixture.json', 'utf8'));
const video = 'AAAAAAAAAAA';
const title = 'YT Fixture';
const rowSelector = `[data-library-focus-key="yt:${video}"]`;

// Real durable pins and audio, restored by the production library hydrator.
// Filler pins make the requested row genuinely offscreen; no DOM stand-ins.
export async function seed(page: Page) {
  const records = [],
    audio = [],
    metadata = [],
    canonical = [];
  for (let i = 19; i < 20; i++) {
    const id = i === 19 ? video : `F${String(i).padStart(10, '0')}`;
    const replace = (value: unknown) =>
      JSON.parse(JSON.stringify(value).replaceAll(video, id));
    const record = replace(fixture.records[0]);
    const ref = replace(JSON.parse(fixture.canonical)[0]);
    const digest = createHash('sha256')
      .update(JSON.stringify(record.record))
      .digest('hex');
    ref.recordSha256 = ref.localRecordSha256 = digest;
    records.push(record);
    audio.push({ ...replace({ ...fixture.audio[0], bytes: undefined }), bytes64: Buffer.from(fixture.audio[0].bytes).toString('base64') });
    metadata.push({
      ...replace(fixture.metadata[0]),
      title: i === 19 ? title : `Filler ${i}`,
    });
    canonical.push(ref);
  }
  await page.goto('/select/');
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-library-hydrating',
    /.*/,
  );
  await page.evaluate(
    async (data) => {
      localStorage.setItem(
        'orvio.canonical-library.v1',
        JSON.stringify(data.canonical),
      );
      localStorage.setItem(
        'orvio.library-add-order.v1',
        JSON.stringify(data.canonical.map((r) => r.videoId)),
      );
      for (const [name, version, rows] of [
        ['orvio.external-sources.v1', 1, { records: data.records }],
        [
          'orvio.external-library.v1',
          2,
          { audio: data.audio, metadata: data.metadata, sessions: [] },
        ],
      ] as const) {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(name, version);
          request.onupgradeneeded = () => {
            for (const store of Object.keys(rows))
              if (!request.result.objectStoreNames.contains(store))
                request.result.createObjectStore(store, { keyPath: 'key' });
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(Object.keys(rows), 'readwrite');
          for (const [store, items] of Object.entries(rows))
            for (const item of items)
              tx.objectStore(store).put(
                item.bytes64
                  ? { ...item, bytes: Uint8Array.from(atob(item.bytes64),c=>c.charCodeAt(0)).buffer }
                  : item,
              );
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      }
    },
    { records, audio, metadata, canonical },
  );
  await page.reload();
  await expect(page.locator(rowSelector)).toHaveCount(1);
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-library-hydrating',
    /.*/,
  );
}

