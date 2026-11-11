import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { validSourceRecord, verifyChartHashes } from '../src/external-source';
import {
  isThumbnailRequest,
  expectArtwork,
  offlineImages,
} from './youtube-artwork-proof';

// Fixture-only static bundle (the value below is not a credential):
// PUBLIC_YOUTUBE_API_KEY=public-browser-fixture npm run build
// PW_EXECUTABLE_PATH=/opt/google/chrome/chrome node_modules/.bin/playwright test --config playwright.client-only.config.ts
// The build includes type checking; this fixture does not qualify the live API.

const VIDEO = 'IMWT6937uUs';
const TITLE =
  'If I have you only (My love X Nerd Connection) (그대만 있다면 (여름날 우리 X 너드커넥션)) — Direct fixture long-title regression';
const AUTHOR = 'Direct fixture channel';
const API = `https://provider.fixture.invalid/v1/videos/${VIDEO}/audio?format=bestaudio%2Fbest&audio-format=wav`;
// Small synthetic PCM fixture. This never downloads a live YouTube artifact.
function wavFixture() {
  const rate = 48000,
    frames = rate * 12;
  const b = Buffer.alloc(44 + frames * 4);
  b.write('RIFF');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i++) {
    const t = i / rate,
      beat = t % 0.5;
    const sample = Math.round(
      23000 * Math.exp(-beat * 18) * Math.sin(2 * Math.PI * 180 * t),
    );
    b.writeInt16LE(sample, 44 + i * 4);
    b.writeInt16LE(sample, 46 + i * 4);
  }
  return b;
}
const wav = wavFixture();
const audioHash = createHash('sha256').update(wav).digest('hex');

async function routeFixture(
  page: Page,
  outcome: 'ok' | 'auth' | 'network' | 'invalid' = 'ok',
) {
  const unexpected: string[] = [],
    direct: string[] = [],
    errors: string[] = [],
    workers: string[] = [];
  page.on('pageerror', (error) =>
    errors.push(error.name + ': ' + error.message),
  );
  page.on('worker', (worker) => workers.push(worker.url()));
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (
      url.origin === (process.env.ORV96_BASE_URL ?? 'http://127.0.0.1:4192') &&
      !/^\/(?:api|v\d+)(?:\/|$)/.test(url.pathname)
    )
      return route.continue();
    if (
      url.href === `https://provider.fixture.invalid/v1/videos/${VIDEO}` &&
      req.method() === 'GET'
    ) {
      expect(
        req.headers().authorization ===
          `Bearer ${process.env.PUBLIC_YOUTUBE_API_KEY ?? 'public-browser-fixture'}`,
      ).toBe(true);
      expect(req.headers().cookie).toBeUndefined();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: VIDEO, title: TITLE, channel: AUTHOR }),
      });
    }
    if (isThumbnailRequest(url) && req.method() === 'GET') {
      expect(req.headers().authorization).toBeUndefined();
      expect(req.headers().cookie).toBeUndefined();
      return route.continue();
    }
    if (url.href !== API || req.method() !== 'GET') {
      unexpected.push(`${req.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    direct.push(url.href);
    // This production-shaped build uses a non-credential fixture value only.
    expect(
      req.headers().authorization ===
        `Bearer ${process.env.PUBLIC_YOUTUBE_API_KEY ?? 'public-browser-fixture'}`,
    ).toBe(true);
    expect(req.headers().prefer).toBe('wait=15');
    expect(req.headers().cookie).toBeUndefined();
    if (outcome === 'network') return route.abort('failed');
    return route.fulfill({
      status: outcome === 'auth' ? 401 : 200,
      headers: {
        'content-type': 'audio/wav',
        'access-control-allow-origin': '*',
      },
      body:
        outcome === 'invalid'
          ? Buffer.from('invalid media')
          : outcome === 'auth'
            ? Buffer.alloc(0)
            : wav,
    });
  });
  return { unexpected, direct, errors, workers };
}

async function add(page: Page) {
  await page.goto('/select/');
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-library-hydrating',
    /.*/,
  );
  await page.locator('#add-youtube').click();
  await expect(page.locator('#youtube-import')).toBeVisible();
  await page
    .locator('#youtube-url')
    .fill(`https://www.youtube.com/watch?v=${VIDEO}`);
  await page.locator('#youtube-submit').click();
  await expect(page.locator('#youtube-import')).not.toBeVisible();
}

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const read = async (name: string, version: number, store: string) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open(name, version);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      try {
        if (!db.objectStoreNames.contains(store)) return [];
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
    const hash = async (b: ArrayBuffer) =>
      Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', b)),
        (n) => n.toString(16).padStart(2, '0'),
      ).join('');
    const audio = await read('orvio.external-library.v1', 2, 'audio');
    return {
      records: await read('orvio.external-sources.v1', 1, 'records'),
      audio: await Promise.all(
        audio.map(async (r) => ({
          key: r.key,
          title: r.title,
          sha: await hash(r.bytes),
          bytes: r.bytes.byteLength,
        })),
      ),
      metadata: await read('orvio.external-library.v1', 2, 'metadata'),
      references: JSON.parse(
        localStorage.getItem('orvio.local-generated-library.v1') ?? '[]',
      ),
      pending: JSON.parse(
        localStorage.getItem('orvio.pending-imports.v1') ?? '[]',
      ),
    };
  });
}

for (const width of [1280, 390])
  test(`full app direct Add at ${width}px uses the actual local worker, persists and plays after reload without network recovery`, async ({
    page,
  }) => {
    const seen = await routeFixture(page);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    await add(page);
    const card = page
      .locator('#songs .song-card:not(.import-pending)')
      .filter({ hasText: TITLE });
    await expect(card).toBeVisible({ timeout: 30000 });
    const artwork = await expectArtwork(card.locator('.youtube-cover'));
    await test.info().attach('new-artwork-pixels', {
      body: JSON.stringify(artwork),
      contentType: 'application/json',
    });
    const saved = await snapshot(page);
    expect(saved.pending).toEqual([]);
    expect(saved.records).toHaveLength(1);
    expect(saved.audio).toHaveLength(1);
    expect(saved.references).toHaveLength(1);
    const record = saved.records[0].record;
    expect(record.videoId).toBe(VIDEO);
    expect(record.sourceProvenance).toBe('local-current35-v1');
    expect(record.audioSha256).toBe(audioHash);
    expect(validSourceRecord(record)).toBe(true);
    expect(await verifyChartHashes(record)).toBe(true);
    expect(saved.audio[0]).toMatchObject({ sha: audioHash, bytes: wav.length });
    expect(saved.metadata[0]).toMatchObject({ title: TITLE, author: AUTHOR });
    expect(saved.references[0].recordSha256).toBe(
      createHash('sha256').update(JSON.stringify(record)).digest('hex'),
    );
    expect(seen.workers.some((url) => /local-chart\.worker/.test(url))).toBe(
      true,
    );
    expect(seen.direct).toHaveLength(1);
    const id = `yt-${VIDEO}-${audioHash.slice(0, 16)}-c${record.chartSetSha256.slice(0, 16)}`;
    await page.goto(`/select/?song=${encodeURIComponent(id)}`);
    await page.reload();
    await expect(
      page.locator('#songs .song-card.selected').filter({ hasText: TITLE }),
    ).toBeVisible({ timeout: 15000 });
    expect(await snapshot(page)).toEqual(saved);
    await page.locator('[data-lanes="5"]').click();
    await expect(page.locator('[data-lanes="5"]')).toHaveClass(/selected/);
    await page.screenshot({
      path: test.info().outputPath(`direct-add-persisted-select-${width}.png`),
    });
    // A re-add uses the verified local pin/audio rather than a second acquisition.
    await add(page);
    await expect(page.locator(`[data-import-video="${VIDEO}"]`)).toHaveCount(0);
    await expect
      .poll(async () => (await snapshot(page)).pending.length)
      .toBe(0);
    expect(seen.direct).toHaveLength(1);
    await page.goto(`/play/${id}/5/low/`);
    await expect(page.locator('#loading-title')).toContainText(TITLE);
    await page.waitForTimeout(1250);
    await page.keyboard.press('Enter');
    await expect
      .poll(() => page.evaluate(() => (window as any).orvioDiagnostics?.active))
      .toBeTruthy();
    await expect(page.locator('#game')).toHaveAttribute('data-song', id);
    if (width === 390) {
      const header = await page.locator('.game-top').evaluate((element) => {
        const exit = element.querySelector<HTMLElement>('#exit')!;
        const title = element.querySelector<HTMLElement>('.song-now strong')!;
        const e = exit.getBoundingClientRect(),
          t = title.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(exit);
        return {
          exitLeft: e.left,
          exitRight: e.right,
          exitWidth: e.width,
          titleLeft: t.left,
          titleRight: t.right,
          titleWidth: t.width,
          exitLines: range.getClientRects().length,
          titleClipped: title.scrollWidth > title.clientWidth,
          titleOverflow: getComputedStyle(title).textOverflow,
        };
      });
      expect(header.exitLines).toBe(1);
      expect(header.exitWidth).toBeGreaterThan(60);
      expect(header.exitLeft).toBeGreaterThanOrEqual(0);
      expect(header.exitRight).toBeLessThan(header.titleLeft);
      expect(header.titleRight).toBeLessThanOrEqual(390);
      expect(header.titleWidth).toBeGreaterThan(100);
      expect(header.titleClipped).toBe(true);
      expect(header.titleOverflow).toBe('ellipsis');
    }
    await page.screenshot({
      path: test.info().outputPath(`direct-add-persisted-play-${width}.png`),
    });
    expect(await snapshot(page)).toEqual(saved);
    expect(seen.direct).toHaveLength(1);
    expect(seen.unexpected).toEqual([]);
    expect(seen.errors).toEqual([]);
    await page.goto(`/select/?song=${encodeURIComponent(id)}`);
    await expectArtwork(card.locator('.youtube-cover'));
    await offlineImages(page);
    await page.reload();
    expect(await expectArtwork(card.locator('.youtube-cover'))).toEqual(
      artwork,
    );
    expect(await snapshot(page)).toEqual(saved);
    await page.screenshot({
      path: test.info().outputPath(`orv96-new-offline-${width}.png`),
    });
  });

for (const [outcome, code, text] of [
  ['auth', 'unavailable', '음원 서비스'],
  ['network', 'network_error', '연결하지 못했습니다'],
  ['invalid', 'integrity_failed', '무결성 검사'],
] as const)
  test(`full app direct Add reports ${outcome} without remote fallback`, async ({
    page,
  }) => {
    const seen = await routeFixture(page, outcome);
    await add(page);
    const row = page.locator(`[data-import-video="${VIDEO}"]`);
    await expect(row).toHaveAttribute('data-state', 'error');
    await expect(row).toHaveAttribute('data-import-error', code);
    await expect(row).toContainText(text);
    if (outcome === 'auth')
      await expect(row).toHaveAttribute('data-import-error-status', '401');
    const stored = await snapshot(page);
    expect(stored.audio).toEqual([]);
    expect(stored.records).toEqual([]);
    expect(stored.pending[0].error).toBe(code);
    await page.screenshot({
      path: test.info().outputPath(`direct-add-${outcome}-error.png`),
    });
    await page.reload();
    await expect(row).toHaveAttribute('data-import-error', code);
    expect(seen.direct).toHaveLength(1);
    expect(seen.unexpected).toEqual([]);
    expect(seen.errors).toEqual([]);
  });

test('full app direct Add reports local quota failure and preserves the durable pin', async ({
  page,
}) => {
  const seen = await routeFixture(page);
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      if (this.name === 'audio')
        throw new DOMException('Fixture quota', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await add(page);
  const row = page.locator(`[data-import-video="${VIDEO}"]`);
  await expect(row).toHaveAttribute('data-state', 'error', { timeout: 30000 });
  await expect(row).toHaveAttribute('data-import-error', 'storage_full');
  await expect(row).toContainText('브라우저 저장 공간');
  const stored = await snapshot(page);
  expect(stored.records).toHaveLength(1);
  expect(stored.audio).toEqual([]);
  expect(stored.pending[0].failure.stage).toBe('storage');
  await page.screenshot({
    path: test.info().outputPath('direct-add-quota-error.png'),
  });
  expect(seen.direct).toHaveLength(1);
  expect(seen.unexpected).toEqual([]);
  expect(seen.errors).toEqual([]);
});
