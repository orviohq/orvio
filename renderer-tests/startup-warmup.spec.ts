import { test, expect } from '@playwright/test';

test('GPU warmup stays under loading and leaves chart, engine and audio untouched', async ({
  page,
}) => {
  for (const path of [
    '/play/first-light/5/low/',
    '/play/first-light/7/high/?speed=9',
  ]) {
    await page.goto(path);
    await page.evaluate(async () => {
      const { Playfield } = await import(
        /* @vite-ignore */ String('/src/renderer.ts')
      );
      const original = Playfield.prototype.warmup;
      (window as any).warmupChecks = [];
      Playfield.prototype.warmup = async function (
        ...args: Parameters<typeof original>
      ) {
        const engine = args[0] as import('../src/engine').Engine;
        const snapshot = () =>
          JSON.stringify({
            states: engine.states,
            events: engine.events,
            score: engine.score,
            resolved: engine.resolved,
          });
        const before = snapshot();
        const overlay = () =>
          !document
            .querySelector('#song-loading')!
            .classList.contains('hidden');
        const loadingBefore = overlay();
        const audioBefore = (window as any).orvioDiagnostics.audioActive;
        await original.apply(this, args);
        (window as any).warmupChecks.push({
          same: before === snapshot(),
          loadingBefore,
          loadingAfter: overlay(),
          audioBefore,
          audioAfter: (window as any).orvioDiagnostics.audioActive,
          active: (window as any).orvioDiagnostics.active,
          frames: this.frames.length,
          work: this.work.length,
        });
      };
    });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    const checks = await page.evaluate(() => (window as any).warmupChecks);
    expect(checks).toEqual([
      {
        same: true,
        loadingBefore: true,
        loadingAfter: true,
        audioBefore: false,
        audioAfter: false,
        active: false,
        frames: 0,
        work: 0,
      },
    ]);
    await expect(page.locator('#song-loading')).toBeHidden();
    // Countdown now precedes the earliest possible first fall, not chart t=0.
    // Warmup still must leave audio/chart/input untouched, as asserted above.
    await expect(page.locator('#countdown')).toHaveText('4');
    const countdown = await page.evaluate(() => {
      const d = (window as any).orvioDiagnostics;
      return { time: d.clock, firstFall: d.notes[0].note.time - 2 };
    });
    expect(countdown.time).toBeLessThan(countdown.firstFall);
    await page.keyboard.press('Escape');
    await page.click('#pause-exit');
  }
});
