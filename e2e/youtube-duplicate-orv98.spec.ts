import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fixture = JSON.parse(readFileSync('a37-external-fixture.json', 'utf8'));
const video = 'AAAAAAAAAAA';
const title = 'YT Fixture';
const rowSelector = `[data-library-focus-key="yt:${video}"]`;

// Real durable pins and audio, restored by the production library hydrator.
// Filler pins make the requested row genuinely offscreen; no DOM stand-ins.
async function seed(page: Page) {
  const records = [],
    audio = [],
    metadata = [],
    canonical = [];
  for (let i = 0; i < 20; i++) {
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

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const stores: Record<string, unknown[]> = {};
    for (const name of [
      'orvio.external-sources.v1',
      'orvio.external-library.v1',
    ]) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const rows = await new Promise<any[]>((resolve, reject) => {
          const request = db.transaction(store).objectStore(store).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        stores[`${name}/${store}`] = await Promise.all(
          rows.map(async (row) => {
            if (!row.bytes) return row;
            const digest = await crypto.subtle.digest('SHA-256', row.bytes);
            return {
              ...row,
              bytes: Array.from(new Uint8Array(digest)),
              byteLength: row.bytes.byteLength,
            };
          }),
        );
      }
      db.close();
    }
    // Selection/scroll is intentionally updated by the requested behavior.
    const local = Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key !== 'orvio.library-selection.v1' && key !== 'orvio.library-display.v1')
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    );
    return { stores, local };
  });
}

async function instrument(page: Page) {
  await page.evaluate(() => {
    const counts = { audio: 0, worker: 0, writes: 0 };
    (window as any).__duplicateCounts = counts;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      counts.audio++;
      return start.apply(this, args);
    };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      counts.audio++;
      return play.call(this);
    };
    window.Worker = new Proxy(window.Worker, {
      construct(target, args) {
        counts.worker++;
        return Reflect.construct(target, args);
      },
    });
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      if (this.name.startsWith('orvio.external-') && args[1] === 'readwrite')
        counts.writes++;
      return transaction.apply(this, args);
    };
  });
}

for (const width of [1280, 390]) {
  test(`existing durable pin repeated Add focuses silently without persistence changes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    const remote: string[] = [],
      errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.route('**/*', (route) => {
      if (new URL(route.request().url()).origin === new URL(process.env.ORV98_BASE_URL??'http://127.0.0.1:4198').origin)
        return route.continue();
      remote.push(route.request().url());
      return route.abort();
    });
    await seed(page);
    await expect(
      page.locator('#songs .song-card:not(.import-pending)'),
    ).toHaveCount(23);
    const baseline = await snapshot(page);
    const variants = [
      `https://www.youtube.com/watch?v=${video}&list=PLfixture&t=12`,
      `https://youtu.be/${video}?si=fixture`,
      `https://www.youtube.com/shorts/${video}`,
      `https://www.youtube.com/live/${video}`,
    ];
    // A second full navigation proves duplicate detection after durable reload.
    for (let round = 0; round < 2; round++) {
      if (round) {
        await page.reload();
        await expect(page.locator(rowSelector)).toHaveCount(1);
        await expect(page.locator('html')).not.toHaveAttribute(
          'data-library-hydrating',
          /.*/,
        );
      }
      await page.waitForLoadState('networkidle');
      await instrument(page);
      const networkBefore = remote.length;
      for (const url of variants) {
        await page.locator('#add-youtube').click();
        await page.locator('#youtube-url').fill(url);
        await page.locator('#songs').evaluate((list) => {
          list.scrollTop = 0;
        });
        const offscreen = await page.locator(rowSelector).evaluate((row) => {
          const rect = row.getBoundingClientRect();
          const list = document
            .querySelector('#songs')!
            .getBoundingClientRect();
          return rect.top >= Math.min(innerHeight, list.bottom);
        });
        expect(offscreen).toBe(true);
        await page.locator('#youtube-submit').click();
        await expect(page.locator('#youtube-import')).not.toBeVisible();
        const row = page.locator(rowSelector);
        await expect(row).toBeFocused();
        await expect(row).toHaveClass(/selected/);
        await expect(row).toContainText(title);
        await expect(
          page.getByText('이미 추가된 곡입니다', { exact: true }).last(),
        ).toBeVisible();
        expect(
          await row.evaluate((element) => {
            const r = element.getBoundingClientRect();
            const b = document.querySelector('#songs')!.getBoundingClientRect();
            return (
              r.top >= Math.max(0, b.top) - 1 &&
              r.bottom <= Math.min(innerHeight, b.bottom) + 1
            );
          }),
        ).toBe(true);
        const toastNode = page.getByText('이미 추가된 곡입니다', {exact:true}).last();
        await expect(toastNode).toBeInViewport();
        await page.waitForTimeout(350);
        const toastBox = await toastNode.evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,scrollY,innerHeight,innerWidth};});
        console.log('TOAST_GEOMETRY',JSON.stringify({width,...toastBox}));
        expect(toastBox.top).toBeGreaterThanOrEqual(0);expect(toastBox.bottom).toBeLessThanOrEqual(toastBox.innerHeight);
        if(width===390)await page.screenshot({path:test.info().outputPath('duplicate-scroll-and-toast-390.png')});
        await expect(page.locator('#songs .import-pending')).toHaveCount(0);
        await expect(
          page.locator('#songs .song-card:not(.import-pending)'),
        ).toHaveCount(23);
      }
      await page.screenshot({
        path: test
          .info()
          .outputPath(`duplicate-add-${width}-reload${round}.png`),
      });
      expect(await snapshot(page)).toEqual(baseline);
      expect(remote.slice(networkBefore)).toEqual([]);
      expect(
        await page.evaluate(() => (window as any).__duplicateCounts),
      ).toEqual({ audio: 0, worker: 0, writes: 0 });
      await expect(page.locator('body')).not.toHaveClass(/previewing/);
    }
    expect(errors).toEqual([]);
  });
}
