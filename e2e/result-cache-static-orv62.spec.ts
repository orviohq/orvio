import { test, expect, Page, BrowserContext } from '@playwright/test';
import fs from 'node:fs';

/**
 * ORV-62 qualification on the production build, served statically (no dev
 * server, service workers blocked). Covers every result route: ?s= shared,
 * ?local= builtin session, #v=3 fragment with and without encoded replay,
 * and #v=5 external share with the real fixture. Asserts: zero unnecessary
 * network, and the persistent display projection paints the verified result
 * BEFORE the module wait (no spinner, no blank), then hydration swaps to
 * the live dialog without replaying the count-up.
 */

const WORKER = 'https://orvio-share.pn-26f.workers.dev/**';
const MODULE_DELAY = 400;

const FRAGMENT_PLAIN =
  'v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1';

// Real replay encoded with the app's own encodeReplay (Node, CompressionStream):
// one perfect hit on first-light 5-key low, engine-verified via replayMatches.
const REPLAY_R =
  'eJwLMgqMVkrLLCou0c3JTM8oUdIx1VHKyS9X0qlWKi5ITU1RsjLUUUpLTEktUrJSyk9LU9JRKs4oTUvLSUXwIcpqdUwNDAx0jGMZGL4smr7rYvfdBgdOhgYw2LDRgYGDEcJu4Lj1fsPb7SumJwAA-aAtKg';
const FRAGMENT_REPLAY =
  'v=3&song=first-light&keys=5&diff=low&score=17857&acc=1.79&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,55' +
  '&r=' +
  REPLAY_R +
  '&rn=154';

const SESSION = JSON.parse(
  fs.readFileSync('e2e/fixtures/orv62-builtin-session.json', 'utf8'),
);
const V5 = JSON.parse(
  fs.readFileSync('e2e/fixtures/progressive-browser.json', 'utf8'),
);

async function slowModules(context: BrowserContext, ms = MODULE_DELAY) {
  await context.route('**/_astro/*.js', async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

async function instrumentWorker(context: BrowserContext, delayMs = 0) {
  const requests: string[] = [];
  await context.route(WORKER, async (route) => {
    if (route.request().method() === 'GET') {
      requests.push(route.request().url());
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      await route.fulfill({
        status: 200,
        json: {
          fragment: FRAGMENT_PLAIN,
          expiresAt: new Date(Date.now() + 86400e3).toISOString(),
        },
      });
    } else await route.abort();
  });
  return requests;
}

async function firstVisibleMs(page: Page): Promise<number> {
  await page.waitForFunction(() => {
    const el = document.querySelector('#results');
    if (!el || document.documentElement.hasAttribute('data-result-pending'))
      return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  });
  return page.evaluate(() => performance.now());
}

/** Assertions for one warm revisit. The projection is consumed by
 * hydration, possibly within milliseconds when modules are memory-cached,
 * so the observable contract is the read-only outcome marker the verified
 * render records: the projection painted before the module wait, identity
 * matched, the spinner never showed, and the count-up did not replay. */
async function expectWarmProjection(page: Page, scoreText: string) {
  await expect(page.locator('#results')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#result-first-paint')).toHaveCount(0);
  await expect(page.locator('#result-score')).toHaveText(scoreText);
  await expect(page.locator('#results')).not.toHaveAttribute(
    'data-result-animating',
    'true',
  );
  const outcome = await page.evaluate(
    () =>
      (window as any).__resultFirstPaintOutcome as {
        painted: boolean;
        matched: boolean;
        paintedAt: number | null;
      },
  );
  expect(outcome.painted).toBe(true);
  expect(outcome.matched).toBe(true);
  expect(outcome.paintedAt).not.toBeNull();
  expect(outcome.paintedAt!).toBeLessThan(MODULE_DELAY);
}

test('ORV-62 static: cold ?s= waits for the worker; warm ?s= paints the projection before modules, no GET, no spinner, no recount', async ({
  page,
  context,
}) => {
  const id = 'replay000000000000000062';
  const requests = await instrumentWorker(context, 400);
  await page.goto('/result/?s=' + id);
  const coldMs = await firstVisibleMs(page);
  await expect(page.locator('#result-score')).toHaveText('500,000');
  expect(requests).toHaveLength(1);
  console.log(`ORV62 static cold=${Math.round(coldMs)}ms`);

  await slowModules(context);
  await page.goto('/result/?s=' + id, { waitUntil: 'commit' });
  await expectWarmProjection(page, '500,000');
  expect(requests).toHaveLength(1); // warm visit never touched the worker
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/orv62-static-warm.png' });
});

test('ORV-62 static: warm builtin ?local= session paints before modules with zero network', async ({
  page,
  context,
}) => {
  const requests = await instrumentWorker(context);
  await page.addInitScript((record) => {
    (window as any).__seed = new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('orvio.builtin-replays.v1', 1);
      r.onupgradeneeded = () =>
        r.result.createObjectStore('sessions', { keyPath: 'key' });
      r.onsuccess = () => {
        const tx = r.result.transaction('sessions', 'readwrite');
        tx.objectStore('sessions').put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      r.onerror = () => reject(r.error);
    });
  }, SESSION);
  const url = '/result/?local=' + encodeURIComponent(SESSION.key);
  await page.goto(url);
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('17,857');
  await slowModules(context);
  await page.goto(url, { waitUntil: 'commit' });
  await expectWarmProjection(page, '17,857');
  expect(requests).toHaveLength(0);
  await page.screenshot({ path: 'test-results/orv62-static-local.png' });
});

test('ORV-62 static: v=3 fragment without replay is fetchless; warm revisit paints before modules', async ({
  page,
  context,
}) => {
  const requests = await instrumentWorker(context);
  await page.goto('/result/#' + FRAGMENT_PLAIN);
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('500,000');
  await slowModules(context);
  // The app hands a v3 result over to /select/ itself (pre-existing 039
  // behavior, verified on the live site), so the revisit is an explicit goto.
  await page.goto('/result/#' + FRAGMENT_PLAIN, { waitUntil: 'commit' });
  await expectWarmProjection(page, '500,000');
  expect(requests).toHaveLength(0);
});

test('ORV-62 static: v=3 fragment with encoded replay decodes locally; warm revisit paints before modules', async ({
  page,
  context,
}) => {
  const requests = await instrumentWorker(context);
  await page.goto('/result/#' + FRAGMENT_REPLAY);
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('17,857');
  await slowModules(context);
  await page.goto('/result/#' + FRAGMENT_REPLAY, { waitUntil: 'commit' });
  await expectWarmProjection(page, '17,857');
  expect(requests).toHaveLength(0);
  await page.screenshot({ path: 'test-results/orv62-static-replay.png' });
});

test('ORV-62 static: v=5 external share with the real fixture renders with record fetch only; warm revisit paints before modules with zero network', async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  await context.route(
    `**/v1/chart-sources/${V5.manifest.videoId}`,
    async (route) => {
      requests.push(route.request().url());
      await route.fulfill({
        status: 200,
        headers: V5.recordHeaders,
        body: V5.recordBody,
      });
    },
  );
  await page.goto('/result/#' + V5.fragment);
  await expect(page.locator('#results')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#result-score')).not.toBeEmpty();
  const score = await page.locator('#result-score').textContent();
  await slowModules(context);
  await page.reload({ waitUntil: 'commit' });
  await expectWarmProjection(page, score!);
  expect(requests).toHaveLength(1); // only the cold record fetch, warm = 0
  await page.screenshot({ path: 'test-results/orv62-static-v5.png' });
});

test('ORV-62 static: warm ?s= projection is visible with typed badges BEFORE modules (real pixels, no watch-replay for replay-less results)', async ({
  page,
  context,
}) => {
  await instrumentWorker(context);
  const url = '/result/?s=static-demo-62-00000001';
  await page.goto(url);
  await expect(page.locator('#results')).toBeVisible();
  await slowModules(context);
  await page.goto(url, { waitUntil: 'commit' });
  // 150ms into a 400ms module wait: the projection must already be painted.
  await page.waitForTimeout(150);
  await expect(page.locator('#result-first-paint')).toBeVisible();
  await expect(page.locator('#rp-score')).toHaveText('500,000');
  await expect(page.locator('#rp-song')).toHaveText('First Light');
  await expect(
    page.locator('#rp-options .result-option-keys b'),
  ).toHaveText('5K');
  await expect(
    page.locator('#rp-options .result-option-difficulty b'),
  ).toHaveText('NM 2');
  // Replay-less fragment: the projection must not invent a watch button.
  await expect(page.locator('#rp-watch-replay')).toHaveClass(/hidden/);
  await expect(page.locator('#rp-fever')).toHaveClass(/hidden/);
  await page.screenshot({ path: 'test-results/orv62-pre-module-150ms.png' });
  await expect(page.locator('#results')).toBeVisible({ timeout: 20000 });
  const outcome = await page.evaluate(
    () => (window as any).__resultFirstPaintOutcome,
  );
  expect(outcome.painted).toBe(true);
  expect(outcome.matched).toBe(true);
  const fcp = await page.evaluate(
    () =>
      performance.getEntriesByType('paint').find(
        (e) => e.name === 'first-contentful-paint',
      )?.startTime ?? null,
  );
  console.log(
    `ORV62 static pre-module: paintedAt=${outcome.paintedAt}ms fcp=${Math.round(fcp ?? -1)}ms moduleDelay=${MODULE_DELAY}ms`,
  );
  expect(fcp).not.toBeNull();
  expect(fcp!).toBeLessThan(MODULE_DELAY);
});

test('ORV-62 static: an expired share projection never paints (zero expired paint)', async ({
  page,
  context,
}) => {
  await context.route(WORKER, async (route) => {
    if (route.request().method() === 'GET')
      await route.fulfill({
        status: 200,
        json: {
          fragment: FRAGMENT_PLAIN,
          expiresAt: new Date(Date.now() + 86400e3).toISOString(),
        },
      });
    else await route.abort();
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      'orvio.settings.v1',
      JSON.stringify({ language: 'ko' }),
    );
    localStorage.setItem(
      'orvio.result-display.v2',
      JSON.stringify({
        v: 2,
        entries: {
          's:static-expired-62-000001': {
            fp: 'x',
            locale: 'ko',
            title: 'Expired',
            scoreText: '999,999',
            combo: 0,
            rateText: '99.99%',
            badges: [],
            expiresAt: Date.now() - 1000,
          },
        },
      }),
    );
  });
  await page.goto('/result/?s=static-expired-62-000001');
  await page.waitForTimeout(300);
  await expect(page.locator('#result-first-paint')).toHaveCount(0);
  await expect(page.locator('#rp-score')).toHaveCount(0);
  // The live flow still completes honestly through the worker.
  await expect(page.locator('#results')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#result-score')).toHaveText('500,000');
  const outcome = await page.evaluate(
    () => (window as any).__resultFirstPaintOutcome,
  );
  expect(outcome.painted).toBe(false);
});

test('ORV-62 static: invalid fragment paints nothing and clears the pending state', async ({
  page,
}) => {
  await page.goto('/result/#v=3&song=no-such-song&keys=5&diff=low&score=1&acc=0.10&combo=0&j=0,0,0,0,0,0,0,0,0,0,0,1');
  await page.waitForTimeout(500);
  await expect(page.locator('#result-first-paint')).toHaveCount(0);
  await expect(page.locator('#results')).not.toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-result-pending',
    /.*/,
  );
});

test('ORV-62 static: missing local session clears the pending state instead of loading forever', async ({
  page,
}) => {
  await page.goto('/result/?local=' + encodeURIComponent('builtin:missing-key'));
  await page.waitForTimeout(500);
  await expect(page.locator('#result-first-paint')).toHaveCount(0);
  await expect(page.locator('#results')).not.toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-result-pending',
    /.*/,
  );
});

test('ORV-62 static: cold first visit still plays the count-up (ORV-59 no regression)', async ({
  page,
  context,
}) => {
  await instrumentWorker(context);
  await page.goto('/result/?s=static-demo-62-00000002');
  // The transient count-up flag must appear on a cold first visit (ORV-59);
  // the animation runs ~1.05s, comfortably inside the polling window.
  await expect(
    page.locator('#results[data-result-animating="true"]'),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#result-score')).toHaveText('500,000', {
    timeout: 20000,
  });
});
