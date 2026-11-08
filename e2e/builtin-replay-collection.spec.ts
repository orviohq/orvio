import { test, expect } from '@playwright/test';
test('actual builtin completion persists frozen chart session and reload collection watch', async ({
  page,
}) => {
  test.setTimeout(100000);
  const captured: string[] = [];
  let shareFailure = false;
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) => {
    if (r.request().method() === 'POST')
      captured.push(r.request().postDataJSON().fragment);
    if (shareFailure)
      return r.fulfill({ status: 503, body: 'bounded test failure' });
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test_only_no_public_write_12345',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    });
  });
  const checkShare = async () => {
    const n = captured.length;
    await page.click('#share-result');
    await expect.poll(() => captured.length).toBe(n + 1);
    const verified = await page.evaluate(async (fragment) => {
      const { readResult } = await import(
        /* @vite-ignore */ String('/src/share.ts')
      );
      const { decodeReplay, replayMatches } = await import(
        /* @vite-ignore */ String('/src/replay.ts')
      );
      const p = new URLSearchParams(fragment),
        result = readResult(p),
        replay = await decodeReplay(p.get('r')!);
      return {
        valid: !!result && !!replay && replayMatches(replay, result),
        length: fragment.length,
        keys: Array.from(p.keys()),
      };
    }, captured[n]);
    expect(verified.valid).toBe(true);
    expect(verified.length).toBeGreaterThan(100);
    expect(verified.keys).not.toContain('local');
    await expect(page.locator('#share-result')).toBeEnabled();
  };
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { listBuiltinSessions } = await import(
          /* @vite-ignore */ String('/src/builtin-replay-library.ts')
        );
        return (await listBuiltinSessions()).length;
      }),
    )
    .toBe(1);
  await checkShare();
  await page.keyboard.press('Escape');
  await page.click('#open-replays');
  await expect(page.locator('.replay-row')).toHaveCount(1);
  await expect(page.locator('.replay-row')).toContainText('First Light');
  await page.reload();
  await expect(page.locator('.replay-row')).toHaveCount(1);
  await page.locator('.replay-row').click();
  await expect(page.locator('#watch-replay')).toBeEnabled();
  await checkShare();
  shareFailure = true;
  await page.reload();
  const beforeFailure = captured.length;
  await page.click('#share-result');
  await expect.poll(() => captured.length).toBe(beforeFailure + 1);
  await expect(page.locator('#share-status')).toBeVisible();
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
  await page.reload();
  await expect(page.locator('#watch-replay')).toBeEnabled();
  await page.click('#watch-replay');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.replayActive),
  );
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape');
  await expect(page.locator('#results')).toBeVisible();
  expect(errors).toEqual([]);
  await page.goto('/replays/');
  await page.screenshot({ path: '/downloads/a24-builtin-session-page.png' });
});
test('builtin archive refuses tampered chart and mode while preserving untouched sessions', async ({
  page,
}) => {
  await page.goto('/select/');
  const result = await page.evaluate(async () => {
    const { SONGS, makeChart } = await import(
      /* @vite-ignore */ String('/src/chart.ts')
    );
    const { replayEngine } = await import(
      /* @vite-ignore */ String('/src/replay.ts')
    );
    const { saveBuiltinSession, listBuiltinSessions, readBuiltinSession } =
      await import(/* @vite-ignore */ String('/src/builtin-replay-library.ts'));
    const replay = {
      version: 1,
      song: SONGS[0].id,
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
          engine.events.filter((e: { value: number }) => e.value === v).length,
      ),
    };
    const a = await saveBuiltinSession(replay, result),
      b = await saveBuiltinSession(replay, result),
      c = await saveBuiltinSession(replay, result);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('orvio.builtin-replays.v1', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite'),
        store = tx.objectStore('sessions');
      for (const [key, mode] of [
        [a, 'chart'],
        [b, 'mode'],
      ]) {
        const r = store.get(key);
        r.onsuccess = () => {
          const raw = r.result;
          if (mode === 'chart') raw.chart[0].time += 0.1;
          else raw.replay.lanes = 7;
          store.put(raw);
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    const listed = await listBuiltinSessions();
    let rejects = 0;
    for (const key of [a, b])
      try {
        await readBuiltinSession(key);
      } catch {
        rejects++;
      }
    return { listed: listed.map((s: { key: string }) => s.key), c, rejects };
  });
  expect(result.listed).toEqual([result.c]);
  expect(result.rejects).toBe(2);
});
test('builtin save denied keeps watch and shows storage-specific recovery', async ({
  page,
}) => {
  test.setTimeout(65000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: any[]) {
      if (this.name === 'orvio.builtin-replays.v1' && args[1] === 'readwrite')
        throw new DOMException('Denied', 'QuotaExceededError');
      return original.apply(this, args as any);
    };
  });
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  await expect(page.locator('[data-sonner-toast]')).toContainText(
    '리플레이를 저장하지 못했습니다',
  );
  await expect(page.locator('[data-sonner-toast]')).not.toContainText('음원');
  await expect(page.locator('#watch-replay')).toBeEnabled();
  await page.click('#watch-replay');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.replayActive),
  );
  expect(errors).toEqual([]);
});
