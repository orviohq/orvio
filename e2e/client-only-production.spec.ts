import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import {
  isThumbnailRequest,
  expectArtwork,
  offlineImages,
} from './youtube-artwork-proof';

const fixture = JSON.parse(
  fs.readFileSync('a37-external-fixture.json', 'utf8'),
);

for (const width of [1280, 390])
  test(`ORV96 old saved source real artwork and offline reload at ${width}`, async ({
    page,
  }) => {
    const input = JSON.parse(
      JSON.stringify(fixture).replaceAll('AAAAAAAAAAA', 'IMWT6937uUs'),
    );
    const digest = createHash('sha256')
      .update(JSON.stringify(input.records[0].record))
      .digest('hex');
    const canonical = JSON.parse(input.canonical);
    canonical[0].recordSha256 = canonical[0].localRecordSha256 = digest;
    input.canonical = JSON.stringify(canonical);
    const unexpected: string[] = [],
      images: string[] = [];
    await page.route('**/*', (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (
        url.origin ===
          (process.env.ORV96_BASE_URL ?? 'http://127.0.0.1:4192') ||
        url.protocol === 'blob:'
      )
        return route.continue();
      if (isThumbnailRequest(url) && request.method() === 'GET') {
        expect(request.headers().authorization).toBeUndefined();
        images.push(url.href);
        return route.continue();
      }
      unexpected.push(url.origin + url.pathname);
      return route.abort();
    });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    const id = await seedExternalFixture(page, input);
    const before = await legacySnapshot(page);
    await page.goto(`/select/?song=${encodeURIComponent(id)}`);
    const card = page.locator('.song-card').filter({ hasText: 'YT Fixture' });
    const pixels = await expectArtwork(card.locator('.youtube-cover'));
    expect(images.length).toBeGreaterThan(0);
    expect(images.length).toBeLessThanOrEqual(3);
    expect(await legacySnapshot(page)).toEqual(before);
    await page.screenshot({
      path: test.info().outputPath(`orv96-old-online-${width}.png`),
    });
    const count = images.length;
    await offlineImages(page);
    await page.reload();
    expect(await expectArtwork(card.locator('.youtube-cover'))).toEqual(pixels);
    expect(images.length).toBe(count);
    expect(await legacySnapshot(page)).toEqual(before);
    expect(unexpected).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`orv96-old-offline-${width}.png`),
    });
    await test.info().attach('old-artwork-pixels', {
      body: JSON.stringify(pixels),
      contentType: 'application/json',
    });
  });

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
  }, input);
  return input.id;
}

async function legacySnapshot(page: any) {
  return page.evaluate(async () => {
    const hash = async (value: ArrayBuffer) =>
      Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', value)),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
    const getAll = async (name: string, version: number, store: string) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const q = indexedDB.open(name, version);
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
      });
      try {
        return await new Promise<any[]>((resolve, reject) => {
          const r = db
            .transaction(store, 'readonly')
            .objectStore(store)
            .getAll();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
      } finally {
        db.close();
      }
    };
    const records = await getAll('orvio.external-sources.v1', 1, 'records');
    const audio = await getAll('orvio.external-library.v1', 2, 'audio');
    const metadata = await getAll('orvio.external-library.v1', 2, 'metadata');
    return {
      canonical: localStorage.getItem('orvio.canonical-library.v1'),
      local: localStorage.getItem('orvio.local-generated-library.v1'),
      records,
      metadata,
      audio: await Promise.all(
        audio.map(async (row) => ({
          key: row.key,
          title: row.title,
          jobId: row.jobId ?? null,
          bytes: row.bytes?.byteLength ?? 0,
          sha: row.bytes ? await hash(row.bytes) : null,
        })),
      ),
    };
  });
}

test('cached production song plays with remote audio blocked and optional thumbnails permitted', async ({
  page,
}) => {
  const external: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      return route.continue();
    if (isThumbnailRequest(url) && route.request().method() === 'GET')
      return route.abort();
    external.push(`${route.request().method()} ${url.href}`);
    return route.abort();
  });

  const id = await seedExternalFixture(page);
  const before = await legacySnapshot(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/select/?song=${encodeURIComponent(id)}`);
  await expect(
    page.locator('#songs .song-card').filter({ hasText: 'YT Fixture' }),
  ).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(
    page.locator('#songs .song-card').filter({ hasText: 'YT Fixture' }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page
      .locator('#songs .song-card.selected')
      .filter({ hasText: 'YT Fixture' }),
  ).toBeVisible({ timeout: 15000 });
  expect(await legacySnapshot(page)).toEqual(before);
  await page.screenshot({
    path: test.info().outputPath('client-only-select-1280.png'),
  });

  await page.goto(`/play/${id}/5/low/`);
  await expect(page.locator('#loading-title')).toHaveText('YT Fixture');
  await page.waitForTimeout(1250);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active, {
    timeout: 30000,
  });
  await expect(page.locator('#game')).toHaveAttribute('data-song', id);
  await page.screenshot({
    path: test.info().outputPath('client-only-play-1280.png'),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath('client-only-play-390.png'),
  });

  const after = await legacySnapshot(page);
  expect(external).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(after).toEqual(before);
});

test('missing local audio is explicit and makes no external request', async ({
  page,
}) => {
  const external: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      return route.continue();
    if (isThumbnailRequest(url) && route.request().method() === 'GET')
      return route.abort();
    external.push(`${route.request().method()} ${url.href}`);
    return route.abort();
  });
  const id = await seedExternalFixture(page, { ...fixture, audio: [] });
  await page.goto(`/play/${id}/5/low/`);
  await page.waitForTimeout(1250);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-sonner-toast]')).toContainText(
    '로컬 오디오 파일이 없습니다',
    { timeout: 15000 },
  );
  expect(external).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics?.active),
  ).toBeFalsy();
});

test('corrupt local audio is explicit and makes no external request', async ({
  page,
}) => {
  const external: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      return route.continue();
    if (isThumbnailRequest(url) && route.request().method() === 'GET')
      return route.abort();
    external.push(`${route.request().method()} ${url.href}`);
    return route.abort();
  });
  const corrupt = JSON.parse(JSON.stringify(fixture));
  corrupt.audio[0].bytes = [0, 1, 2, 3];
  delete corrupt.audio[0].bytesGzip64;
  delete corrupt.audio[0].bytes64;
  const id = await seedExternalFixture(page, corrupt);
  await page.goto(`/play/${id}/5/low/`);
  await page.waitForTimeout(1250);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-sonner-toast]')).toContainText(
    '손상되어 재생할 수 없습니다',
    { timeout: 15000 },
  );
  expect(external).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics?.active),
  ).toBeFalsy();
});

test('persisted YouTube row opens the exact source without changing selection', async ({
  page,
}) => {
  const external: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      return route.continue();
    if (isThumbnailRequest(url) && route.request().method() === 'GET')
      return route.abort();
    external.push(`${route.request().method()} ${url.href}`);
    return route.abort();
  });

  const id = await seedExternalFixture(page);
  const sourceUrl = 'https://www.youtube.com/watch?v=AAAAAAAAAAA';
  const youtube = page
    .locator('#songs .song-card')
    .filter({ hasText: 'YT Fixture' });
  const firstLight = page
    .locator('#songs .song-card')
    .filter({ hasText: 'First Light' });
  const menu = page.locator('.library-context-menu');
  const menuState = () =>
    menu.evaluate((element) => {
      const source = element.querySelector<HTMLElement>(
        '[data-action="source"]',
      );
      const share = element.querySelector<HTMLElement>('[data-action="share"]');
      return {
        open: element.matches(':popover-open'),
        items: [...element.querySelectorAll<HTMLElement>('[role="menuitem"]')]
          .filter((item) => !item.hidden)
          .map((item) => item.dataset.action),
        sourceText: source?.textContent ?? null,
        sourceVisible: !!source && !source.hidden,
        shareFocused: document.activeElement === share,
      };
    });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/select/?song=${encodeURIComponent(id)}`);
  await expect(youtube).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(youtube).toBeVisible({ timeout: 15000 });
  await expect(
    page
      .locator('#songs .song-card.selected')
      .filter({ hasText: 'YT Fixture' }),
  ).toBeVisible({ timeout: 15000 });

  await youtube.focus();
  await page.keyboard.press('Shift+F10');
  await expect.poll(async () => (await menuState()).open).toBe(true);
  expect(await menuState()).toEqual({
    open: true,
    items: ['source', 'share', 'remove'],
    sourceText: '원곡 열기',
    sourceVisible: true,
    shareFocused: true,
  });
  await page.screenshot({
    path: test.info().outputPath('client-only-source-menu-1280.png'),
  });

  await page.evaluate(() => {
    const state = { calls: [] as unknown[][], original: window.open };
    (window as any).__orv90Open = state;
    window.open = ((...args: unknown[]) => {
      state.calls.push(args);
      return null;
    }) as typeof window.open;
  });
  await menu.locator('[data-action="source"]').click();
  const firstCalls = await page.evaluate(() => {
    const state = (window as any).__orv90Open;
    window.open = state.original;
    return state.calls as unknown[][];
  });
  expect(firstCalls).toEqual([[sourceUrl, '_blank', 'noopener,noreferrer']]);
  await expect(
    page
      .locator('#songs .song-card.selected')
      .filter({ hasText: 'YT Fixture' }),
  ).toBeVisible();

  const builtin = await firstLight.evaluate((row) => {
    const rect = row.getBoundingClientRect();
    row.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 20,
        clientY: rect.top + 20,
      }),
    );
    const current = [
      ...document.querySelectorAll<HTMLElement>('.library-context-menu'),
    ].at(-1);
    return { open: !!current?.matches(':popover-open') };
  });
  expect(builtin).toEqual({ open: false });

  await firstLight.click();
  await expect(
    page
      .locator('#songs .song-card.selected')
      .filter({ hasText: 'First Light' }),
  ).toBeVisible();

  await page.evaluate(() => {
    const state = { calls: [] as unknown[][], original: window.open };
    (window as any).__orv90Open = state;
    window.open = ((...args: unknown[]) => {
      state.calls.push(args);
      return null;
    }) as typeof window.open;
  });
  await youtube.click({ button: 'right' });
  await expect.poll(async () => (await menuState()).open).toBe(true);
  expect(await menuState()).toEqual({
    open: true,
    items: ['source', 'share', 'remove'],
    sourceText: '원곡 열기',
    sourceVisible: true,
    shareFocused: true,
  });
  await expect(
    page
      .locator('#songs .song-card.selected')
      .filter({ hasText: 'First Light' }),
  ).toBeVisible();
  await menu.locator('[data-action="source"]').click();
  const secondCalls = await page.evaluate(() => {
    const state = (window as any).__orv90Open;
    window.open = state.original;
    return state.calls as unknown[][];
  });
  expect(secondCalls).toEqual([[sourceUrl, '_blank', 'noopener,noreferrer']]);
  await expect(
    page
      .locator('#songs .song-card.selected')
      .filter({ hasText: 'First Light' }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await youtube.scrollIntoViewIfNeeded();
  await youtube.focus();
  await page.keyboard.press('Shift+F10');
  await expect.poll(async () => (await menuState()).open).toBe(true);
  expect(await menuState()).toEqual({
    open: true,
    items: ['source', 'share', 'remove'],
    sourceText: '원곡 열기',
    sourceVisible: true,
    shareFocused: true,
  });
  await page.screenshot({
    path: test.info().outputPath('client-only-source-menu-390.png'),
  });

  expect(external).toEqual([]);
  expect(pageErrors).toEqual([]);
});
