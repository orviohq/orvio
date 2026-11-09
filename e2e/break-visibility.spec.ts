import { test, expect } from '@playwright/test';
for (const reduced of [false, true])
  test(`real misses keep corridor clear in ${reduced ? 'reduced' : 'normal'} motion and replay`, async ({
    browser,
  }, testInfo) => {
    const c = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      }),
      p = await c.newPage(),
      errors: string[] = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    if (reduced)
      await p.addInitScript(() => {
        const k = 'orvio.settings.v1';
        const s = JSON.parse(localStorage.getItem(k) || '{}');
        s.reducedMotion = true;
        localStorage.setItem(k, JSON.stringify(s));
      });
    await p.goto('/play/first-light/5/low/');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() =>
      Boolean((window as any).orvioDiagnostics?.active),
    );
    await p.waitForFunction(
      () => document.querySelector('#judge')?.textContent === 'BREAK',
    );
    const clear = async () => {
      const impact = p.locator('#impact');
      await expect(impact).toHaveClass('break-impact');
      expect(
        await impact.evaluate((e) => getComputedStyle(e).backgroundColor),
      ).toBe('rgba(0, 0, 0, 0)');
      expect(
        await impact.evaluate((e) => getComputedStyle(e).boxShadow),
      ).toContain('0px 0px 0px 3px');
      for (const sel of ['#game', '#highway-wrap', '#highway']) {
        if (await p.locator(sel).count())
          expect(
            await p.locator(sel).evaluate((e) => getComputedStyle(e).filter),
          ).toBe('none');
      }
    };
    await clear();
    await p.screenshot({
      path: testInfo.outputPath(`miss-${reduced ? 'reduced' : 'normal'}.png`),
    });
    await p.locator('#results').waitFor({ state: 'visible', timeout: 50000 });
    await p.click('#watch-replay');
    await p.waitForFunction(() =>
      Boolean(
        (window as any).orvioDiagnostics?.active &&
        (window as any).orvioDiagnostics?.replayActive &&
        (window as any).orvioAudioTime > 3,
      ),
    );
    await p.waitForFunction(
      () => document.querySelector('#judge')?.textContent === 'BREAK',
    );
    await expect(p.locator('#game')).toBeVisible();
    await clear();
    await p.screenshot({
      path: testInfo.outputPath(`replay-${reduced ? 'reduced' : 'normal'}.png`),
    });
    await c.close();
    expect(errors).toEqual([]);
  });
test('mobile actual replay misses keep note corridor clear', async ({
  browser,
}, testInfo) => {
  const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    }),
    p = await c.newPage(),
    errors: string[] = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto('/select/');
  const fragment = await p.evaluate(async () => {
    const { replayEngine } = await import(
      /* @vite-ignore */ String('/src/replay.ts')
    );
    const { builtinShareFragment } = await import(
      /* @vite-ignore */ String('/src/builtin-share-fragment.ts')
    );
    const replay: any = {
      version: 1,
      song: 'first-light',
      lanes: 5,
      difficulty: 'low',
      options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 1 },
      ops: [
        ...Array.from({ length: 360 }, (_, i) => [1, i * 100, i / 10]),
        [1, 36000, 9999],
      ],
      end: 36000,
    };
    const e = replayEngine(replay);
    e.update(9999);
    return builtinShareFragment(replay, {
      song: 'first-light',
      lanes: 5,
      difficulty: 'low',
      options: replay.options,
      score: e.score,
      accuracy: e.sum / e.total,
      combo: e.maxCombo,
      judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
        (v) => e.events.filter((x: { value: number }) => x.value === v).length,
      ),
    });
  });
  await p.goto('/result/#' + fragment);
  await p.locator('#results').waitFor({ state: 'visible' });
  await p.locator('#watch-replay').scrollIntoViewIfNeeded();
  await p.click('#watch-replay');
  await p.waitForFunction(() =>
    Boolean(
      (window as any).orvioDiagnostics?.active &&
      (window as any).orvioDiagnostics?.replayActive &&
      (window as any).orvioAudioTime > 3,
    ),
  );
  await p.waitForFunction(
    () => document.querySelector('#judge')?.textContent === 'BREAK',
  );
  await expect(p.locator('#game')).toBeVisible();
  expect(await p.evaluate(() => (window as any).orvioDiagnostics.active)).toBe(
    true,
  );
  expect(
    await p
      .locator('#impact')
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe('rgba(0, 0, 0, 0)');
  await p.screenshot({ path: testInfo.outputPath('mobile-replay-miss.png') });
  expect(errors).toEqual([]);
  await c.close();
});
