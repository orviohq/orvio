import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const fixture = JSON.parse(
  fs.readFileSync('tests/fixtures/progressive-browser.json', 'utf8'),
);
async function install(page: Page, mode = 'stall') {
  await page.addInitScript(
    ({ mode }) => {
      const original = window.fetch.bind(window);
      (window as any).__streamCalls = [];
      (window as any).__previewAborts = [];
      window.fetch = (input: any, init?: RequestInit) => {
        const url = String(input);
        if (
          url.startsWith(
            'https://orvio-share.pn-26f.workers.dev/v1/chart-sources/',
          )
        ) {
          if (init?.method && init.method !== 'GET')
            throw Error('Unexpected mutation');
          (window as any).__streamCalls.push(url);
          if (url.endsWith('/audio'))
            init?.signal?.addEventListener('abort', () => {
              (window as any).__previewAborts.push(url);
            });
          return original(
            '/__test/' + url.split('/v1/chart-sources/')[1] + '?mode=' + mode,
            init,
          );
        }
        return original(input, init);
      };
      const AC = window.AudioContext;
      (window as any).__meters = [];
      window.AudioContext = class extends AC {
        constructor(options?: AudioContextOptions) {
          super(options);
          const original = this.createGain.bind(this);
          this.createGain = () => {
            const gain = original(),
              meter = this.createAnalyser();
            gain.connect(meter);
            (window as any).__meters.push(meter);
            return gain;
          };
        }
      };
    },
    { mode },
  );
  await page.route('https://i.ytimg.com/**', (r) => r.fulfill({ status: 404 }));
}
async function audioRows(page: Page) {
  return page.evaluate(async () => {
    const d = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = indexedDB.open('orvio.external-library.v1', 2);
      q.onupgradeneeded = () => {
        for (const s of ['audio', 'sessions', 'metadata'])
          if (!q.result.objectStoreNames.contains(s))
            q.result.createObjectStore(s, { keyPath: 'key' });
      };
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    return await new Promise<number>((resolve, reject) => {
      const q = d.transaction('audio').objectStore('audio').count();
      q.onsuccess = () => {
        d.close();
        resolve(q.result);
      };
      q.onerror = () => reject(q.error);
    });
  });
}
async function open(page: Page) {
  await page.goto('/result/#' + fixture.fragment);
  await expect(page.locator('#results')).toBeVisible();
  await page.locator('#watch-replay').click();
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
}
test('cold replay starts verified before full download, freezes for stall, resumes and persists only whole-verified bytes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await install(page);
  await open(page);
  expect(await audioRows(page)).toBe(0);
  await page.waitForFunction(
    () => ((window as any).orvioDiagnostics?.clock ?? -1) > 0.2,
  );
  const peak = await page.evaluate(() =>
    Math.max(
      ...(window as any).__meters.map((m: AnalyserNode) => {
        const a = new Float32Array(m.fftSize);
        m.getFloatTimeDomainData(a);
        return Math.max(...a.map(Math.abs));
      }),
    ),
  );
  expect(peak).toBeGreaterThan(0);
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics?.audioContextState === 'suspended',
  );
  const before = await page.evaluate(
    () => (window as any).orvioDiagnostics.clock,
  );
  await page.waitForTimeout(600);
  const after = await page.evaluate(
    () => (window as any).orvioDiagnostics.clock,
  );
  expect(Math.abs(after - before)).toBeLessThan(0.001);
  expect(await audioRows(page)).toBe(0);
  await page.screenshot({ path: '/downloads/orv16-actual-stall.png' });
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics?.audioContextState === 'running',
  );
  await expect.poll(() => audioRows(page)).toBe(1);
  await page.waitForFunction(() => (window as any).orvioDiagnostics.clock > 3);
  await page.screenshot({ path: '/downloads/orv16-actual-resume.png' });
  await expect(page.locator('#results')).toBeVisible({ timeout: 20000 });
  expect(errors).toEqual([]);
  const calls = await page.evaluate(() => (window as any).__streamCalls);
  expect(calls.filter((s: string) => s.endsWith('/audio'))).toHaveLength(1);
  console.log(
    'PROGRESSIVE_REAL',
    JSON.stringify({
      peak,
      stallClockBefore: before,
      stallClockAfter: after,
      calls,
    }),
  );
});
test('midstream corruption stops playback and never saves partial audio', async ({
  page,
}) => {
  await install(page, 'corrupt');
  await open(page);
  expect(await audioRows(page)).toBe(0);
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics?.active === false,
    { timeout: 15000 },
  );
  expect(await audioRows(page)).toBe(0);
  await expect(page.locator('#lobby')).toBeVisible();
  await expect(page.locator('[data-sonner-toast]')).toBeVisible();
});
test('exit during a hung stream cancels work and never auto-resumes or persists', async ({
  page,
}) => {
  await install(page);
  await open(page);
  await page.click('#exit');
  await expect(page.locator('#results')).toBeVisible();
  await page.waitForTimeout(7000);
  expect(await audioRows(page)).toBe(0);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.active),
  ).toBe(false);
});

test('focus loss during a cold replay aborts without stale resume; a later verified run and cache repeat remain independent', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await install(page);
  await open(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#results')).toBeVisible();
  expect(await audioRows(page)).toBe(0);
  await page.waitForTimeout(6500);
  expect(await audioRows(page)).toBe(0);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.active),
  ).toBe(false);
  await page.locator('#watch-replay').click();
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
  await expect.poll(() => audioRows(page), { timeout: 10000 }).toBe(1);
  await expect(page.locator('#results')).toBeVisible({ timeout: 20000 });
  const calls = await page.evaluate(
    () =>
      (window as any).__streamCalls.filter((s: string) => s.endsWith('/audio'))
        .length,
  );
  expect(calls).toBe(2);
  await page.locator('#watch-replay').click();
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.clock > 0.5,
  );
  expect(
    await page.evaluate(
      () =>
        (window as any).__streamCalls.filter((s: string) =>
          s.endsWith('/audio'),
        ).length,
    ),
  ).toBe(calls);
  await page.click('#exit');
  await expect(page.locator('#results')).toBeVisible();
  expect(errors).toEqual([]);
});

test('verified canonical chart without hydrated audio starts progressively and manual pause dominates guard completion', async ({
  page,
}) => {
  await install(page);
  await page.goto('/select/');
  await page.evaluate(
    async ({ record, recordSha }) => {
      const key = `${record.videoId}:${record.audioSha256}:chart:${record.chartSetSha256}`;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const q = indexedDB.open('orvio.external-sources.v1', 1);
        q.onupgradeneeded = () =>
          q.result.createObjectStore('records', { keyPath: 'key' });
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
      });
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction('records', 'readwrite');
        t.objectStore('records').put({ key, record, pinnedAt: Date.now() });
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      });
      db.close();
      const bytes = new TextEncoder().encode(JSON.stringify(record)),
        hash = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
          (b) => b.toString(16).padStart(2, '0'),
        ).join('');
      localStorage.setItem(
        'orvio.canonical-library.v1',
        JSON.stringify([
          {
            videoId: record.videoId,
            audioSha256: record.audioSha256,
            chartSetSha256: record.chartSetSha256,
            recordSha256: recordSha,
            localRecordSha256: hash,
          },
        ]),
      );
    },
    {
      record: fixture.record,
      recordSha: fixture.recordHeaders['X-SourceRecord-SHA256'],
    },
  );
  await page.reload();
  const row = page
    .locator('#songs .song-card[data-song]')
    .filter({ hasText: fixture.record.videoId });
  await expect(row).toBeVisible();
  await row.click();
  await page.waitForFunction(() =>
    (window as any).__streamCalls.some((u: string) => u.endsWith('/audio')),
  );
  expect(await audioRows(page)).toBe(0);
  await page.click('#start');
  await expect
    .poll(() => page.evaluate(() => (window as any).__previewAborts.length))
    .toBeGreaterThan(0);
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
  expect(await audioRows(page)).toBe(0);
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.clock > 0.3,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  const clock = await page.evaluate(
    () => (window as any).orvioDiagnostics.clock,
  );
  await expect.poll(() => audioRows(page), { timeout: 10000 }).toBe(1);
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => (window as any).orvioDiagnostics.audioContextState,
    ),
  ).toBe('suspended');
  expect(
    Math.abs(
      (await page.evaluate(() => (window as any).orvioDiagnostics.clock)) -
        clock,
    ),
  ).toBeLessThan(0.001);
  await expect(page.locator('#pause')).toBeVisible();
  await page.click('#resume');
  await page.waitForFunction(
    (c) => (window as any).orvioDiagnostics.clock > c + 0.2,
    clock,
  );
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await expect(page.locator('#lobby')).toBeVisible();
});
