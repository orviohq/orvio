import { test, expect } from '@playwright/test';
test.use({ hasTouch: true });
test('A32 archive art/time/duration and wheel keyboard touch scroll preserve archives', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/select/');
  const before = await page.evaluate(async () => {
    const { SONGS } = await import(/* @vite-ignore */ String('/src/chart.ts'));
    const { replayEngine } = await import(
      /* @vite-ignore */ String('/src/replay.ts')
    );
    const { saveBuiltinSession } = await import(
      /* @vite-ignore */ String('/src/builtin-replay-library.ts')
    );
    for (let i = 0; i < 24; i++) {
      const replay = {
        version: 1,
        song: SONGS[i % 3].id,
        lanes: 5,
        difficulty: 'low',
        options: { speed: 3, fader: 'off', shuffle: 'off', seed: 1 },
        ops: [],
        end: 100,
      };
      const engine = replayEngine(replay);
      engine.update(9999);
      const result = {
        song: replay.song,
        lanes: 5,
        difficulty: 'low',
        score: engine.score,
        accuracy: engine.sum / engine.total,
        combo: engine.maxCombo,
        judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
          (v) =>
            engine.events.filter((e: { value: number }) => e.value === v)
              .length,
        ),
      };
      await saveBuiltinSession(replay, result);
    }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('orvio.builtin-replays.v1', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const rows = await new Promise<any[]>((resolve, reject) => {
      const r = db
        .transaction('sessions', 'readonly')
        .objectStore('sessions')
        .getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    delete rows[0].playedAt;
    delete rows[0].durationSec;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').put(rows[0]);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return JSON.stringify(rows);
  });
  await page.click('#open-replays');
  await expect(page.locator('.replay-row')).toHaveCount(24);
  await expect(page.locator('.replay-art')).toHaveCount(24);
  await expect(page.locator('.replay-time[datetime]')).toHaveCount(23);
  await expect(page.locator('.replay-time').last()).toHaveText(
    '플레이 시각 미기록',
  );
  await expect(page.locator('.replay-mode').first()).toContainText('곡 길이');
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('.replay-art')]
      .slice(0, 4)
      .every((x) => x.complete && x.naturalWidth > 0),
  );
  const state = () =>
    page.locator('#replays').evaluate((el) => ({
      top: el.scrollTop,
      max: el.scrollHeight - el.clientHeight,
      height: el.clientHeight,
      width: el.scrollWidth,
      client: el.clientWidth,
    }));
  const a = await state();
  expect(a.max).toBeGreaterThan(1000);
  expect(a.width).toBe(a.client);
  await page.screenshot({ path: '/downloads/a32-archive-desktop.png' });
  await page.locator('.replay-row').first().hover();
  await page.mouse.wheel(0, 1200);
  await expect.poll(async () => (await state()).top).toBeGreaterThan(500);
  await page.locator('#replays').focus();
  await page.keyboard.press('End');
  await expect
    .poll(async () => {
      const s = await state();
      return s.max - s.top;
    })
    .toBeLessThan(2);
  await expect(page.locator('.replay-row').last()).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.replay-row')).toHaveCount(24);
  await page.locator('#replays').evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({ path: '/downloads/a32-archive-mobile.png' });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 190, y: 730 }],
  });
  for (let y = 690; y >= 210; y -= 40)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 190, y }],
    });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect.poll(async () => (await state()).top).toBeGreaterThan(100);
  await page.locator('#replays').focus();
  await page.keyboard.press('End');
  await expect
    .poll(async () => {
      const s = await state();
      return s.max - s.top;
    })
    .toBeLessThan(2);
  await expect(page.locator('.replay-row').last()).toBeInViewport();
  expect((await state()).width).toBe((await state()).client);
  await page.screenshot({ path: '/downloads/a32-archive-mobile-bottom.png' });
  const after = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('orvio.builtin-replays.v1', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const rows = await new Promise<any[]>((resolve, reject) => {
      const r = db
        .transaction('sessions', 'readonly')
        .objectStore('sessions')
        .getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return JSON.stringify(rows);
  });
  expect(after).toBe(before);
  expect(errors).toEqual([]);
});
