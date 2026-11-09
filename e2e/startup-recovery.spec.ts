import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const mode of [
  'cancel',
  'cancel-button',
  'second-resume',
  'timeout',
  'reject',
  'late-render',
  'warmup',
]) {
  test(`startup recovery ${mode}`, async ({ page }) => {
    test.setTimeout(25000);
    // A37 preloads the song at the play-route gate, before any gesture, so
    // the first render happens during page load. Hold that first render from
    // the start of the document, not after it has already completed.
    if (mode === 'late-render')
      await page.addInitScript(() => {
        const w = window as any;
        const native = OfflineAudioContext.prototype.startRendering;
        let first = true;
        OfflineAudioContext.prototype.startRendering = function () {
          if (!first) return native.call(this);
          first = false;
          const rendered = native.call(this);
          return new Promise<AudioBuffer>((resolve, reject) => {
            w.releaseOld = () => rendered.then(resolve, reject);
          });
        };
      });
    await page.goto('/play/first-light/5/low/');
    await page.evaluate((mode) => {
      const w = window as any;
      w.starts = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args: any[]) {
        if (this.context instanceof AudioContext) w.starts++;
        return (start as any).apply(this, args);
      };
      if (mode === 'timeout') {
        const timer = window.setTimeout;
        let shortened = false;
        window.setTimeout = ((fn: any, ms: any, ...args: any[]) => {
          const delay =
            ms === 30000 && !shortened ? ((shortened = true), 500) : ms;
          return timer(fn, delay, ...args);
        }) as any;
      }
      if (mode === 'late-render') {
        // hook installed before navigation (see addInitScript above)
      } else if (mode === 'warmup') {
        const native = window.requestAnimationFrame;
        w.savedRaf = native;
        window.requestAnimationFrame = (cb) => {
          if (document.querySelector('#song-loading:not(.hidden)')) {
            w.warmupBlocked = true;
            return 987654321;
          }
          return native(cb);
        };
        w.releaseOld = () => {
          window.requestAnimationFrame = native;
        };
      } else {
        const resume = AudioContext.prototype.resume;
        let first = true;
        let calls = 0;
        AudioContext.prototype.resume = function () {
          calls++;
          if (mode === 'second-resume' && calls === 1) return resume.call(this);
          if (!first) return resume.call(this);
          first = false;
          if (mode === 'reject')
            return Promise.reject(new Error('injected refusal'));
          return new Promise<void>((resolve) => {
            w.releaseOld = resolve;
          });
        };
      }
    }, mode);
    await page.keyboard.press('Enter');
    if (
      mode === 'cancel' ||
      mode === 'cancel-button' ||
      mode === 'second-resume' ||
      mode === 'late-render' ||
      mode === 'warmup'
    ) {
      await expect(page.locator('#song-loading')).toBeVisible();
      if (
        ['cancel', 'cancel-button', 'second-resume', 'late-render'].includes(
          mode,
        )
      )
        await page.waitForFunction(
          () => typeof (window as any).releaseOld === 'function',
        );
      if (mode === 'warmup')
        await page.waitForFunction(
          () => (window as any).warmupBlocked === true,
          null,
          { polling: 10 },
        );
      if (mode === 'cancel-button') {
        await page.keyboard.press('Tab');
        await expect(page.locator('#cancel-startup')).toBeFocused();
        await page.keyboard.press('Space');
      } else await page.keyboard.press('Escape');
    }
    await expect(page.locator('#song-loading')).toBeHidden({ timeout: 6000 });
    await expect(page.locator('#lobby')).toBeVisible();
    await expect(page.locator('#start')).toBeEnabled();
    if (mode === 'warmup')
      await page.evaluate(() => (window as any).releaseOld());
    await page.click('#start');
    await page.waitForFunction(
      () => (window as any).orvioDiagnostics.active,
      null,
      { polling: 10 },
    );
    const session = await page.evaluate(
      () => (window as any).orvioDiagnostics.sessionId,
    );
    await page.evaluate(() => (window as any).releaseOld?.());
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).starts)).toBe(1);
    expect(
      await page.evaluate(() => (window as any).orvioDiagnostics.sessionId),
    ).toBe(session);
    await expect(page.locator('#song-loading')).toBeHidden();
    fs.writeFileSync(
      test.info().outputPath(`startup-recovery-${mode}.json`),
      JSON.stringify(
        await page.evaluate(() => ({
          starts: (window as any).starts,
          active: (window as any).orvioDiagnostics.active,
          audioContextState: (window as any).orvioDiagnostics.audioContextState,
        })),
        null,
        2,
      ),
    );
    if (mode === 'cancel')
      await page.screenshot({
        path: test.info().outputPath('startup-recovery-retry.png'),
      });
  });
}
