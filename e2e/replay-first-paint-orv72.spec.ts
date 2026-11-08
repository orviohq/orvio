import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const fixture = JSON.parse(
  fs.readFileSync('e2e/fixtures/orv72-builtin-session.json', 'utf8'),
);
async function seed(p: any, count = 40) {
  await p.goto('/select/');
  await p.evaluate(
    async ({ fixture, count }: any) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('orvio.builtin-replays.v1', 1);
        r.onupgradeneeded = () =>
          r.result.createObjectStore('sessions', { keyPath: 'key' });
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const t = db.transaction('sessions', 'readwrite');
        for (let i = 0; i < count; i++)
          t.objectStore('sessions').put({
            ...fixture,
            key: 'builtin:orv72-' + i,
            playedAt: 1760000000000 + i,
          });
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      });
      db.close();
    },
    { fixture, count },
  );
}
for (const width of [1440, 390])
  test(`replay collection before-module pixels and verified handoff ${width}`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [],
      effects: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => {
      if (r.method() !== 'GET') effects.push(r.url());
    });
    await seed(page);
    await page.goto('/replays/');
    await expect(page.locator('#replay-list .replay-row')).toHaveCount(40);
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('orvio.replay-list-display.v1') || '{}')
          .v === 2,
    );
    await page.evaluate(() => document.fonts.ready);
    const geometry = () =>
      page.evaluate(() => {
        const selectors = [
          '#app>header',
          '#replays .section-title',
          '#replay-list .replay-row',
        ];
        return selectors.map((s) => {
          const r = document.querySelector(s)!.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        });
      });
    const expected = await geometry();
    await page.screenshot({ path: `/downloads/orv72-live-${width}.png` });
    await context.route('**/_astro/*.js', async (r) => {
      await new Promise((x) => setTimeout(x, 2200));
      await r.continue();
    });
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('#replay-first-paint')).toBeVisible();
    await expect(page.locator('#cached-replay-list .replay-row')).toHaveCount(
      40,
    );
    await expect(page.locator('#replay-first-paint')).toHaveAttribute(
      'inert',
      '',
    );
    await page.evaluate(() => document.fonts.ready);
    const actual = await page.evaluate(() =>
      [
        '#replay-first-paint>header',
        '#cached-replays .section-title',
        '#cached-replay-list .replay-row',
      ].map((s) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    console.log('ORV72_GEOMETRY', width, JSON.stringify({ expected, actual }));
    for (let i = 0; i < 3; i++)
      for (const key of ['x', 'y', 'width', 'height'] as const)
        expect(Math.abs(expected[i][key] - actual[i][key])).toBeLessThan(1);
    await page.screenshot({ path: `/downloads/orv72-initial-${width}.png` });
    await expect(page.locator('#replay-first-paint')).toHaveCount(0, {
      timeout: 20000,
    });
    await expect(page.locator('#replay-list .replay-row')).toHaveCount(40);
    expect(errors).toEqual([]);
    expect(effects).toEqual([]);
    await page.locator('#replay-list .replay-row').first().click();
    await expect(page.locator('#results')).toBeVisible();
  });
test('invalid/stale language projection is discarded without altering verified sessions', async ({
  page,
  context,
}) => {
  await seed(page, 2);
  await page.goto('/replays/');
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(2);
  await page.evaluate(() => {
    const key = 'orvio.replay-list-display.v1',
      c = JSON.parse(localStorage.getItem(key)!);
    c.lang = 'xx';
    localStorage.setItem(key, JSON.stringify(c));
  });
  await context.route('**/_astro/*.js', async (r) => {
    await new Promise((x) => setTimeout(x, 500));
    await r.continue();
  });
  await page.reload({ waitUntil: 'commit' });
  await expect(page.locator('#replay-first-paint')).toHaveCount(0, {
    timeout: 20000,
  });
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(2);
});

test('empty and deleted collections never replace stored sessions with display data', async ({
  page,
  context,
}) => {
  await seed(page, 2);
  await page.goto('/replays/');
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(2);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('orvio.builtin-replays.v1');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('sessions', 'readwrite');
      t.objectStore('sessions').clear();
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator('#replay-first-paint')).toHaveCount(0);
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(0);
  await expect(page.locator('#replays-empty')).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('orvio.replay-list-display.v1'),
    ),
  ).toBeNull();
  await page.reload();
  await expect(page.locator('#replay-first-paint')).toHaveCount(0);
  await expect(page.locator('#replays-empty')).toBeVisible();
});
test('malformed projection and local read errors cannot authorize stale sessions', async ({
  page,
  context,
}) => {
  await seed(page, 2);
  await page.goto('/replays/');
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(2);
  await page.evaluate(() =>
    localStorage.setItem('orvio.replay-list-display.v1', '{bad json'),
  );
  await page.reload();
  await expect(page.locator('#replay-first-paint')).toHaveCount(0);
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(2);
  await context.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = ((...args: any[]) => {
      if (args[0] === 'orvio.builtin-replays.v1')
        throw new DOMException('Fixture unavailable', 'UnknownError');
      return open(args[0], args[1]);
    }) as any;
  });
  await page.reload();
  await expect(page.locator('#replay-first-paint')).toHaveCount(0);
  await expect(
    page.locator('#replays-empty[data-state=read-error]'),
  ).toBeVisible();
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem('orvio.replay-list-display.v1'),
    ),
  ).toBeNull();
});
