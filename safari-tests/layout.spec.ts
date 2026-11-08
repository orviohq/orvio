import { test, expect } from '@playwright/test';
test('layout matrix keeps artwork fixed and result artwork separate with real replay', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/select/');
    const original = await page.locator('#selected-art').evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    await page.evaluate(async () => {
      const { SONGS } = await import(
        /* @vite-ignore */ String('/src/chart.ts')
      );
      SONGS[1].title = 'Long title '.repeat(30);
    });
    await page
      .locator('[data-song="1"]')
      .evaluate((e) => (e as HTMLElement).click());
    const updated = await page.locator('#selected-art').evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    expect(updated).toEqual(original);
    await page.screenshot({ path: info.outputPath(`select-${width}.png`) });
    const fragment = await page.evaluate(async () => {
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
        options: { speed: 4.5, fader: 'off', shuffle: 'off', seed: 1 },
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
          (v) =>
            e.events.filter((x: { value: number }) => x.value === v).length,
        ),
      });
    });

    await page.goto('/result/#' + fragment);
    await expect(page.locator('#results')).toBeVisible();
    await expect(page.locator('#retry [data-i18n]')).toHaveAttribute(
      'data-i18n',
      'start',
    );
    const art = await page.locator('#result-art').boundingBox(),
      title = await page.locator('#result-song').boundingBox();
    expect(art!.width).toBeGreaterThan(200);
    const desktop = await page.evaluate(
      () =>
        matchMedia('(min-width:901px) and (hover:hover) and (pointer:fine)')
          .matches,
    );
    if (desktop) {
      expect(title!.x).toBeGreaterThanOrEqual(art!.x + art!.width);
      const rank = await page.locator('#result-rank').boundingBox();
      expect(rank!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
    } else expect(title!.y).toBeGreaterThanOrEqual(art!.y + art!.height);
    expect(
      await page
        .locator('#results')
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`result-${width}.png`) });
    await page.locator('#watch-replay').scrollIntoViewIfNeeded();
    await page.click('#watch-replay');
    await page.waitForFunction(() =>
      Boolean(
        (window as any).orvioDiagnostics.active &&
        (window as any).orvioDiagnostics.replayActive,
      ),
    );
    await page.waitForFunction(() => (window as any).orvioAudioTime > 3);
    const bounds = await page.locator('#game').boundingBox();
    expect(bounds!.y).toBe(0);
    expect(bounds!.height).toBe(height);
    const zoom = await page.evaluate(() => window.visualViewport?.scale ?? 1);
    await page
      .locator('#game')
      .dblclick({ position: { x: width / 2, y: height / 2 } });
    expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(
      zoom,
    );
    await page.screenshot({ path: info.outputPath(`replay-${width}.png`) });
    await page.click('#exit');
  }
  expect(errors).toEqual([]);
});
