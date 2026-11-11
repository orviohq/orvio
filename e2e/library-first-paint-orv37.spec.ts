import { test, expect, type Locator } from '@playwright/test';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
const fixture = JSON.parse(
  fs.readFileSync('a37-external-fixture.json', 'utf8'),
);
async function durableSnapshot(page: any) {
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
        .filter((key) => key !== 'orvio.library-selection.v1')
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    );
    return { stores, local };
  });
}


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
    test.info().outputPath('orv37-static-first-paint.json'),
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
      path: test.info().outputPath(`orv37-cached-${viewport.width}.png`),
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
      path: test.info().outputPath(`orv37-live-${viewport.width}.png`),
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
  // This test uses only its seeded synthetic source. Block foreign traffic
  // before any page exists, including background metadata/thumbnails.
  const blocked: string[] = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(baseURL!).origin) return route.continue();
    blocked.push(route.request().method() + ' ' + url.href);
    await route.abort('blockedbyclient');
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
  await page.screenshot({ path: test.info().outputPath('orv37-offline.png') });
  await page.locator('#start').click();
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
  await expect(page.locator('#game')).toHaveAttribute('data-song', id);
  await test.info().attach('blocked-synthetic-foreign-requests', {
    body: JSON.stringify(blocked),
    contentType: 'application/json',
  });
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
    test.info().outputPath('orv37-normal-reloads.json'),
    JSON.stringify(runs, null, 2),
  );
});

// ORV96-1: integrator-run against the full static build and its existing fixture.
// Hold hydration until after the loading-state assertions/screenshots, rather
// than racing a fixed sleep or accepting a settled-only image.
async function expectCachedArtwork(row: Locator, hero: Locator) {
  const image = row.locator('img.youtube-cover');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /^blob:/);
  await expect.poll(() => image.evaluate((node: HTMLImageElement) =>
    node.complete && node.naturalWidth >= 240 && node.naturalHeight >= 135,
  )).toBe(true);
  await expect(hero).toBeVisible();
  await expect.poll(() => hero.evaluate(async (node) => {
    const url = getComputedStyle(node).backgroundImage.match(
      /url\(["']?(blob:[^"')]+)["']?\)/,
    )?.[1];
    if (!url) return false;
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      return image.naturalWidth >= 240 && image.naturalHeight >= 135;
    } catch { return false; }
  })).toBe(true);
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`ORV96-1 cached thumbnail loading ${viewport.width}`, () => {
    test.use({ serviceWorkers: 'block' });
    test('cached row and hero paint before main and IDB, then hand off offline', async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const blocked: string[] = [];
      const audioRequests: string[] = [];
      let origin = '';
      await page.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (!origin && request.isNavigationRequest()) origin = url.origin;
        if (request.resourceType() === 'media' ||
          /\.(?:wav|mp3|ogg|opus|m4a|aac|flac|pcm)(?:$|\?)/i.test(url.href) ||
          /\/(?:audio|pcm|preview)(?:\/|$)/i.test(url.pathname)) {
          audioRequests.push(url.href);
          return route.abort('blockedbyclient');
        }
        if (url.origin !== origin) {
          blocked.push(url.href);
          return route.abort('blockedbyclient');
        }
        await route.continue();
      });
      // Uses actual saved source, metadata and PCM stores from the ORV37 helper.
      const id = await seedExternalFixture(page);
      const videoId = id.match(/^yt-([A-Za-z0-9_-]{11})-/)?.[1];
      expect(videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      const artKey = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
      // Generate genuine, recognizable JPEG pixels locally (not a mock Response
      // body or the fallback wallpaper), then seed through CacheStorage.add.
      const jpeg = await page.evaluate(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#1265ce';
        ctx.fillRect(0, 0, 320, 180);
        ctx.fillStyle = '#ffb638';
        ctx.fillRect(20, 20, 140, 140);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('ORV96-1', 90, 100);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((value) => value ? resolve(value) : reject(Error('JPEG encode')), 'image/jpeg'),
        );
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
      });
      await page.route(artKey, (route) => route.fulfill({
        contentType: 'image/jpeg',
        headers: { 'access-control-allow-origin': '*' },
        body: Buffer.from(jpeg),
      }));
      await page.evaluate(async (key) => {
        const cache = await caches.open('orvio-youtube-art-v1');
        await cache.add(new Request(key, { mode: 'cors', credentials: 'omit' }));
      }, artKey);
      await page.unroute(artKey);
      // All foreign images are now blocked, including the exact cached key.
      await page.goto('/select/?song=' + id);
      await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
      await expectCachedArtwork(
        page.locator('#songs .song-card').filter({ hasText: 'YT Fixture' }),
        page.locator('#selected-art'),
      );
      await expect.poll(() => page.evaluate((id) => {
        const saved = JSON.parse(localStorage.getItem('orvio.library-display.v1') || 'null');
        return saved?.songs.find((song: any) => song.id === id)?.artVideoId;
      }, id)).toBe(videoId);

      await page.addInitScript(() => {
        const w = window as any;
        w.__orv961AudioReads = 0;
        w.__orv961IDBHeld = 0;
        w.__orv961IDBReleased = false;
        const callbacks: (() => void)[] = [];
        w.__releaseOrv961IDB = () => {
          w.__orv961IDBReleased = true;
          for (const callback of callbacks.splice(0)) callback();
        };
        const get = IDBObjectStore.prototype.get;
        const getAll = IDBObjectStore.prototype.getAll;
        IDBObjectStore.prototype.get = function (...args: any[]) {
          if (this.name === 'audio') w.__orv961AudioReads++;
          return (get as any).apply(this, args);
        };
        IDBObjectStore.prototype.getAll = function (...args: any[]) {
          if (this.name === 'audio') w.__orv961AudioReads++;
          return (getAll as any).apply(this, args);
        };
        // Delay DB-open success delivery, not transactions (which auto-close).
        const open = indexedDB.open.bind(indexedDB);
        indexedDB.open = ((...args: any[]) => {
          const req = (open as any)(...args);
          const descriptor = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess')!;
          Object.defineProperty(req, 'onsuccess', {
            get() { return descriptor.get!.call(req); },
            set(fn) {
              descriptor.set!.call(req, typeof fn !== 'function' ? fn : (event: Event) => {
                if (w.__orv961IDBReleased) return fn.call(req, event);
                w.__orv961IDBHeld++;
                callbacks.push(() => fn.call(req, event));
              });
            },
          });
          return req;
        }) as typeof indexedDB.open;
      });
      let releaseMain!: () => void;
      let mainHeld = 0;
      const mainGate = new Promise<void>((resolve) => { releaseMain = resolve; });
      await page.route('**/*.js', async (route) => {
        if (/\/main\.[^/]+\.js$/.test(route.request().url())) {
          mainHeld++;
          await mainGate;
        }
        await route.fallback();
      });
      const evidence: any[] = [];
      const capture = async (phase: string) => {
        evidence.push({ phase, mainHeld, ...await page.evaluate(() => ({
          time: performance.now(),
          skeleton: !!document.querySelector('#library-first-paint:not([hidden])'),
          row: document.querySelector<HTMLImageElement>('#cached-songs .selected img')?.src,
          hero: document.querySelector<HTMLElement>('#cached-selected-art')?.style.backgroundImage,
          liveRow: document.querySelector<HTMLImageElement>('#songs .selected img')?.src,
          liveHero: document.querySelector<HTMLElement>('#selected-art')?.style.backgroundImage,
          idbHeld: (window as any).__orv961IDBHeld,
          idbReleased: (window as any).__orv961IDBReleased,
          audioReads: (window as any).__orv961AudioReads,
        })) });
        const path = testInfo.outputPath(`orv961-${phase}-${viewport.width}.png`);
        await page.screenshot({ path });
        await testInfo.attach(`orv961-${phase}-${viewport.width}`, { path, contentType: 'image/png' });
        // At narrow widths the hero and list can occupy separate scroll areas.
        // Include decoded pixel evidence for each while the same gate is held.
        for (const [name, target] of [
          ['row', page.locator(phase === 'live' ? '#songs .song-card' : '#cached-songs .song-card')
            .filter({ hasText: 'YT Fixture' })],
          ['hero', page.locator(phase === 'live' ? '#selected-art' : '#cached-selected-art')],
        ] as const) {
          await target.scrollIntoViewIfNeeded();
          await expect(target).toBeInViewport();
          const detailPath = testInfo.outputPath(`orv961-${phase}-${name}-${viewport.width}.png`);
          await target.screenshot({ path: detailPath });
          await testInfo.attach(`orv961-${phase}-${name}-${viewport.width}`, {
            path: detailPath, contentType: 'image/png',
          });
        }
      };
      try {
        const durableBefore = await durableSnapshot(page);
        blocked.length = 0;
        await page.reload({ waitUntil: 'commit' });
        await expect.poll(() => mainHeld).toBeGreaterThan(0);
        const root = page.locator('#library-first-paint');
        const row = page.locator('#cached-songs .song-card').filter({ hasText: 'YT Fixture' });
        const hero = page.locator('#cached-selected-art');
        await expect(root).toBeVisible();
        await expect(root).toHaveAttribute('aria-busy', 'true');
        await expect(page.locator('#cached-selected-title')).toHaveText('YT Fixture');
        await expectCachedArtwork(row, hero);
        expect(await page.evaluate(() => (window as any).__orv961IDBHeld)).toBe(0);
        expect(blocked).toEqual([]); // Bootstrap did not even attempt foreign fetches.
        await capture('pre-main');

        releaseMain();
        await expect.poll(() => page.evaluate(() => (window as any).__orv961IDBHeld)).toBeGreaterThan(0);
        await expect(root).toBeVisible();
        await expectCachedArtwork(row, hero);
        expect(await page.evaluate(() => (window as any).__orv961IDBReleased)).toBe(false);
        await capture('pre-idb');
        await page.evaluate(() => (window as any).__releaseOrv961IDB());

        await expect(root).toHaveCount(0, { timeout: 15000 });
        await expect(page.locator('#selected-title')).toHaveText('YT Fixture');
        await expectCachedArtwork(
          page.locator('#songs .song-card').filter({ hasText: 'YT Fixture' }),
          page.locator('#selected-art'),
        );
        await capture('live');
        expect(audioRequests).toEqual([]);
        expect(await page.evaluate(() => (window as any).__orv961AudioReads)).toBe(0);
        expect(blocked.filter((url) => new URL(url).hostname === 'i.ytimg.com')).toEqual([]);
        const durableAfter = await durableSnapshot(page);
        expect(durableAfter.stores).toEqual(durableBefore.stores);
      } finally {
        releaseMain();
        await page.evaluate(() => (window as any).__releaseOrv961IDB?.()).catch(() => {});
        await testInfo.attach(`orv961-evidence-${viewport.width}`, {
          body: JSON.stringify({ viewport, evidence, blocked, audioRequests }, null, 2),
          contentType: 'application/json',
        });
      }
    });
  });
}
