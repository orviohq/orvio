import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('audio readiness is cached while fresh pre-play preserves wallpaper and an elapsed route gate adds no extra dwell', async ({
  page,
}) => {
  const samples: any[] = [];
  await page.addInitScript(() => {
    const w = window as any;
    w.__renders = 0;
    w.__timers = [];
    const render = OfflineAudioContext.prototype.startRendering;
    OfflineAudioContext.prototype.startRendering = function () {
      w.__renders++;
      return render.call(this);
    };
    const timer = window.setTimeout;
    window.setTimeout = ((fn: any, ms: any, ...args: any[]) => {
      if (ms > 0 && ms <= 1200) w.__timers.push(ms);
      return timer(fn, ms, ...args);
    }) as any;
  });
  await page.goto('/play/afterimage/7/mid/');
  const measure = async (kind: string) => {
    const before = await page.evaluate(() => ({
      at: performance.now(),
      renders: (window as any).__renders,
    }));
    if (kind === 'indexeddb') await page.waitForTimeout(1250);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    const state = await page.evaluate(() => ({
      at: performance.now(),
      renders: (window as any).__renders,
      timers: (window as any).__timers,
      diag: (window as any).orvioDiagnostics,
    }));
    const duration = state.at - before.at;
    samples.push({
      kind,
      ms: Math.round(duration),
      renders: state.renders,
      rendersDuringStart: state.renders - before.renders,
    });

    await expect(page.locator('#song-loading')).toBeHidden();
    await expect(page.locator('#game')).toHaveAttribute(
      'data-song',
      'afterimage',
    );
    await page.screenshot({ path: `/downloads/orv37-${kind}.png` });
    if (kind === 'indexeddb') expect(duration - 1250).toBeLessThan(1100);
    if (kind === 'memory') expect(duration).toBeGreaterThanOrEqual(1180);
  };
  await measure('cold');
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  const memoryRenders = await page.evaluate(() => (window as any).__renders);
  await measure('memory');
  expect(await page.evaluate(() => (window as any).__renders)).toBe(
    memoryRenders,
  );
  await page.goto('/play/afterimage/7/mid/');
  await expect(page.locator('#song-loading')).toBeVisible();
  // Deliberately no 3s/400ms gate hold. Press as soon as route is usable.
  await measure('indexeddb');
  expect(await page.evaluate(() => (window as any).__renders)).toBe(0);
  console.log('STARTUP_SAMPLES', JSON.stringify(samples));
  fs.writeFileSync(
    '/downloads/orv37-startup-samples.json',
    JSON.stringify(samples, null, 2),
  );
});
