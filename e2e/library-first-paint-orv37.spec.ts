import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
const fixture = JSON.parse(
  fs.readFileSync('a37-external-fixture.json', 'utf8'),
);
async function seedExternalFixture(
  page: any,
  input = fixture,
): Promise<string> {
  if (input.audio?.[0]?.bytesGzip64)
    input.audio[0].bytes64 = gunzipSync(
      Buffer.from(input.audio[0].bytesGzip64, 'base64'),
    ).toString('base64');
  await page.goto('/select/');
  await page.evaluate(async (p: any) => {
    localStorage.setItem('orvio.canonical-library.v1', p.canonical);
    const put = async (
      name: string,
      version: number,
      stores: string[],
      rows: Record<string, any[]>,
    ) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const q = indexedDB.open(name, version);
        q.onupgradeneeded = () => {
          for (const s of stores)
            if (!q.result.objectStoreNames.contains(s))
              q.result.createObjectStore(s, { keyPath: 'key' });
        };
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(stores, 'readwrite');
        for (const [store, items] of Object.entries(rows))
          for (const r of items)
            tx.objectStore(store).put(
              r.bytes64
                ? {
                    ...r,
                    bytes: Uint8Array.from(atob(r.bytes64), (c) =>
                      c.charCodeAt(0),
                    ).buffer,
                  }
                : r.bytes
                  ? { ...r, bytes: new Uint8Array(r.bytes).buffer }
                  : r,
            );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    };
    await put('orvio.external-sources.v1', 1, ['records'], {
      records: p.records,
    });
    await put(
      'orvio.external-library.v1',
      2,
      ['audio', 'metadata', 'sessions'],
      { audio: p.audio, metadata: p.metadata },
    );
    if (p.extensions)
      await put('orvio.chart-extensions.v1', 1, ['extensions'], {
        extensions: p.extensions,
      });
  }, input);
  return input.id;
}

test('cached list paints before delayed audio reads and slow metadata', async ({
  page,
}) => {
  const id = await seedExternalFixture(page);
  await page.goto('/select/?song=' + id);
  await expect(
    page.locator('#songs .song-card').filter({ hasText: 'YT Fixture' }),
  ).toBeVisible();
  await page.addInitScript(() => {
    (window as any).__audioReads = 0;
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (...args: any[]) {
      const req = (get as any).apply(this, args);
      if (this.name === 'audio') {
        (window as any).__audioReads++;
        const descriptor = Object.getOwnPropertyDescriptor(
          IDBRequest.prototype,
          'onsuccess',
        )!;
        Object.defineProperty(req, 'onsuccess', {
          set(fn) {
            descriptor.set!.call(req, (event: Event) =>
              setTimeout(() => fn.call(req, event), 1800),
            );
          },
          get() {
            return descriptor.get!.call(req);
          },
        });
      }
      return req;
    };
    const w = window as any;
    w.__paint = [];
    let last = '';
    const sample = () => {
      const live = [...document.querySelectorAll('#songs .song-card')].some(
        (e) =>
          e.textContent?.includes('YT Fixture') &&
          (e as HTMLElement).offsetHeight > 0,
      );
      const preview = [
        ...document.querySelectorAll(
          '#library-first-paint [data-cached-title]',
        ),
      ].some((e) => e.textContent?.includes('YT Fixture'));
      const state = JSON.stringify({ live, preview });
      if (last !== state) {
        w.__paint.push({ t: Math.round(performance.now()), live, preview });
        last = state;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.route(
    '**/metadata',
    (r) =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          void r.fulfill({ status: 503 }).then(resolve).catch(resolve);
        }, 8000),
      ),
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__paint.some((s: any) => s.live || s.preview),
      ),
    )
    .toBe(true);
  console.log(
    'FIRST_PAINT',
    JSON.stringify(await page.evaluate(() => (window as any).__paint)),
  );
  await expect(
    page.locator('#songs .song-card').filter({ hasText: 'YT Fixture' }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__audioReads)).toBe(0);
  console.log(
    'FINAL_PAINT',
    JSON.stringify(await page.evaluate(() => (window as any).__paint)),
  );
  const samples = await page.evaluate(() => (window as any).__paint);
  const first = samples.findIndex((x: any) => x.live || x.preview);
  expect(samples.slice(first).every((x: any) => x.live || x.preview)).toBe(
    true,
  );
  expect(samples[first].t).toBeLessThan(250);
  fs.writeFileSync(
    '/downloads/orv37-static-first-paint.json',
    JSON.stringify(
      {
        scenario:
          'synthetic existing canonical library; local audio IDB callback +1800ms; metadata GET +8000ms',
        samples,
      },
      null,
      2,
    ),
  );
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`HTML cache survives 2-second module delay ${viewport.width}`, async ({
    page,
    browser,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('https://i.ytimg.com/**', (r) =>
      r.fulfill({
        contentType: 'image/png',
        body: fs.readFileSync('public/wallpapers/first-light.png'),
      }),
    );
    const id = await seedExternalFixture(page);
    await page.goto('/select/?song=' + id);
    await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
    await page.route('**/*.js', async (route) => {
      if (/\/main\.[^/]+\.js$/.test(route.request().url()))
        await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    const navigation = page.reload({ waitUntil: 'commit' });
    await navigation;
    await expect(page.locator('#library-first-paint')).toBeVisible();
    await expect(page.locator('#cached-selected-title')).toHaveText(
      'YT Fixture',
    );
    const cached = await page
      .locator('#cached-songs .song-card')
      .first()
      .evaluate((e) => {
        const c = e.querySelector('.cover')!.getBoundingClientRect(),
          r = e.getBoundingClientRect();
        return { width: c.width, height: c.height, row: r.height };
      });
    expect(cached.width).toBeGreaterThanOrEqual(112);
    await page.screenshot({
      path: `/downloads/orv37-cached-${viewport.width}.png`,
    });
    await expect(page.locator('#library-first-paint')).toHaveCount(0, {
      timeout: 15000,
    });
    const live = await page
      .locator('#songs .song-card')
      .first()
      .evaluate((e) => {
        const c = e.querySelector('.cover')!.getBoundingClientRect(),
          r = e.getBoundingClientRect();
        return { width: c.width, height: c.height, row: r.height };
      });
    expect(Math.abs(live.width - cached.width)).toBeLessThan(1);
    expect(Math.abs(live.height - cached.height)).toBeLessThan(1);
    expect(Math.abs(live.row - cached.row)).toBeLessThan(2);
    await page.screenshot({
      path: `/downloads/orv37-live-${viewport.width}.png`,
    });
  });
}
test('tampered display cache remains text only, hidden tracks never reappear', async ({
  page,
}) => {
  const id = await seedExternalFixture(page);
  await page.goto('/select/?song=' + id);
  await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
  await page.evaluate((id) => {
    const key = 'orvio.library-display.v1';
    const c = JSON.parse(localStorage.getItem(key)!);
    c.songs[0].title = '<img src=x onerror=alert(1)>';
    c.songs[0].art = 'https://evil.invalid/steal';
    localStorage.setItem(key, JSON.stringify(c));
    localStorage.setItem('orvio.library-hidden.v1', JSON.stringify([id]));
  }, id);
  let evil = 0;
  page.on('request', (r) => {
    if (r.url().includes('evil.invalid')) evil++;
  });
  await page.route('**/*.js', async (route) => {
    if (/\/main\.[^/]+\.js$/.test(route.request().url()))
      await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  await page.reload({ waitUntil: 'commit' });
  await expect(page.locator('#cached-songs')).not.toContainText('YT Fixture');
  await expect(page.locator('#cached-songs [onerror]')).toHaveCount(0);
  await expect(page.locator('#library-first-paint')).toHaveCount(0, {
    timeout: 15000,
  });
  expect(evil).toBe(0);
});
test('display cache cannot authorize corrupted PCM playback', async ({
  page,
}) => {
  const id = await seedExternalFixture(page);
  await page.goto('/select/?song=' + id);
  await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((r) => {
      const q = indexedDB.open('orvio.external-library.v1', 2);
      q.onsuccess = () => r(q.result);
    });
    await new Promise<void>((r) => {
      const tx = db.transaction('audio', 'readwrite');
      const store = tx.objectStore('audio');
      const q = store.getAll();
      q.onsuccess = () => {
        for (const row of q.result) {
          new Uint8Array(row.bytes)[100] ^= 1;
          store.put(row);
        }
      };
      tx.oncomplete = () => r();
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
  await page.locator('#start').click();
  await expect(page.locator('[data-sonner-toast]')).toBeVisible({
    timeout: 10000,
  });
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics?.active),
  ).toBe(false);
});

test('offline reload retains cached library and verified local playback', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    serviceWorkers: 'allow',
    locale: 'ko-KR',
  });
  const page = await context.newPage();
  const id = await seedExternalFixture(page);
  await page.goto('/select/?song=' + id);
  await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
  await page.screenshot({ path: '/downloads/orv37-offline.png' });
  await page.locator('#start').click();
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
  await expect(page.locator('#game')).toHaveAttribute('data-song', id);
  await context.close();
});

test('normal repeated reload paints saved list without audio preload', async ({
  page,
}) => {
  const id = await seedExternalFixture(page);
  await page.goto('/select/?song=' + id);
  await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
  await page.addInitScript(() => {
    (window as any).__normal = [];
    const run = () => {
      const cached = document.getElementById('cached-selected-title');
      const live = document.getElementById('selected-title');
      if (cached?.offsetHeight || live?.offsetHeight)
        (window as any).__normal.push({
          t: Math.round(performance.now()),
          cached: !!cached?.offsetHeight,
          live: !!live?.offsetHeight,
        });
      else requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  });
  const runs = [];
  for (let i = 0; i < 5; i++) {
    await page.reload();
    await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
    runs.push(await page.evaluate(() => (window as any).__normal[0]));
  }
  console.log('NORMAL_RELOADS', JSON.stringify(runs));
  fs.writeFileSync(
    '/downloads/orv37-normal-reloads.json',
    JSON.stringify(runs, null, 2),
  );
});
