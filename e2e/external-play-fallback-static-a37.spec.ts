import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
const fixture = JSON.parse(
  fs.readFileSync('a37-external-fixture.json', 'utf8'),
);
// A37: the static host serves 404.html for external play URLs; the page must
// boot the game for exact yt source-id paths (lanes 4-8) without ever showing
// the 404 notice, keep the plain 404 for anything else, and recover to the
// library when the source is not on this device. The server status stays 404 -
// a local restore, not a shared/remote link.
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

const sampler = () => {
  const w = window as any;
  w.__flashLog = [];
  let last = '';
  const sample = () => {
    const q = (s: string) => {
      const el = document.querySelector(s);
      return el ? !el.classList.contains('hidden') : null;
    };
    const state = JSON.stringify({
      home: q('#home-screen'),
      ready: q('#ready-screen'),
      loading: q('#song-loading'),
      select: q('#lobby'),
      notFound: (() => {
        const el = document.querySelector('.not-found');
        return el ? getComputedStyle(el).display !== 'none' : null;
      })(),
    });
    if (state !== last) {
      last = state;
      w.__flashLog.push({ t: Math.round(performance.now()), state });
    }
    if (performance.now() < 60000) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
};

test('external play fallback boots the game with no 404 flash', async ({
  page,
}) => {
  const id = await seedExternalFixture(page);
  await page.addInitScript(sampler);
  const res = await page.goto(`/play/${id}/5/low/`);
  expect(res?.status()).toBe(404);
  await expect(page.locator('#song-loading')).toBeVisible({ timeout: 15000 });
  const frames: { t: number; state: string }[] = await page.evaluate(
    () => (window as any).__flashLog,
  );
  console.log('FALLBACK FRAMES', JSON.stringify(frames));
  const states = frames.map((f) => JSON.parse(f.state));
  expect(states.some((s) => s.notFound === true)).toBe(false);
  expect(states.some((s) => s.home === true)).toBe(false);
  expect(states.some((s) => s.ready === true)).toBe(false);
  await expect(page.locator('.not-found')).toBeHidden();
  await expect(page.locator('#loading-title')).toHaveText('YT Fixture');
  await page.screenshot({ path: 'test-results/a37-play-fallback.png' });
  const startedAt = await page.evaluate(() => performance.now());
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active, {
    timeout: 30000,
  });
  const elapsed = (await page.evaluate(() => performance.now())) - startedAt;
  console.log('EXTERNAL_LOCAL_START_MS', Math.round(elapsed));
  expect(elapsed).toBeLessThan(1100);
  await expect(page.locator('#game')).toHaveAttribute('data-song', id);
});

test('supported external seven-key route restores exact saved source', async ({
  page,
}) => {
  const id = await seedExternalFixture(page);
  await page.goto(`/play/${id}/7/low/`);
  await expect(page.locator('#loading-title')).toHaveText('YT Fixture');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
  await expect(page.locator('#game')).toHaveAttribute('data-song', id);
  await expect(page.locator('#keycaps span')).toHaveCount(7);
});

test('non-source play paths keep the plain 404 without the game', async ({
  page,
}) => {
  const res = await page.goto('/play/missing/5/low/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('.not-found')).toBeVisible();
  await page.waitForTimeout(800);
  expect(await page.locator('#app').count()).toBe(0);
});

test('unknown external source recovers to the library with a notice', async ({
  page,
}) => {
  await page.goto('/select/');
  const res = await page.goto('/play/yt-ZZZZZZZZZZZ-0123456789abcdef/5/low/');
  expect(res?.status()).toBe(404);
  await expect(page).toHaveURL(/\/select\//, { timeout: 15000 });
  await expect(page.locator('#lobby')).toBeVisible();
  await expect(page.locator('[data-sonner-toast]')).toBeVisible();
});

test('mobile restores local song but does not start direct gameplay', async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4198',
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const id = await seedExternalFixture(page);
  await page.goto(`/play/${id}/5/low/`);
  await expect(page.locator('#ready-title')).toHaveText('YT Fixture');
  await expect(page.locator('#ready-screen')).toBeVisible();
  await expect(page.locator('#ready-start')).toBeDisabled();
  await page.screenshot({ path: 'test-results/a37-mobile-fallback.png' });
  await context.close();
});

test('bundle failure exposes visible recovery instead of indefinite blank', async ({
  page,
}) => {
  await page.route('**/_astro/*.js', (r) => r.abort());
  await page.goto(`/play/${fixture.id}/5/low/`);
  await expect(page.locator('.not-found')).toBeVisible({ timeout: 12000 });
  await expect(page.locator('.not-found a')).toHaveAttribute(
    'href',
    '/select/',
  );
});
