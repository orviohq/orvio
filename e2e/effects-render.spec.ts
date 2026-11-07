import { test, expect } from '@playwright/test';
test('real renderer blink, gear blink, fog, blind and pixel retain original chart and scoring', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const chart = await page.evaluate(() =>
    (window as any).orvioDiagnostics.notes.map((s: any) => s.note),
  );
  for (const fader of [
    'blink',
    'blink2',
    'fog',
    'blind',
    'pixel',
    'pixel2',
    'off',
  ]) {
    await page.keyboard.press('F3');
    await page
      .locator('.icon-options-fader [data-value=' + fader + ']')
      .click();
    await page.keyboard.press('Escape');
    await page.click('#resume');
    await page.waitForTimeout(100);
    const fx = () =>
      page.evaluate(() => (window as any).orvioDiagnostics.metrics.effects);
    if (fader === 'blink' || fader === 'blink2') {
      const prop = fader === 'blink' ? 'noteAlpha' : 'gearAlpha';
      await expect.poll(async () => (await fx())[prop]).toBe(0);
      await expect.poll(async () => (await fx())[prop]).toBe(1);
    } else if (fader === 'blind') expect((await fx()).noteAlpha).toBe(0);
    else if (fader === 'fog') expect((await fx()).fog).toBe(true);
    if (fader === 'pixel' || fader === 'pixel2') {
      const keys = ['d', 'f', 'Space', 'j', 'k'];
      const n = await page.evaluate(() =>
        (window as any).orvioDiagnostics.notes
          .filter(
            (s: any) =>
              s.note.time > (window as any).orvioAudioTime + 0.25 &&
              !s.note.end,
          )
          .slice(0, 2)
          .map((s: any) => s.note),
      );
      for (const x of n) {
        await page.waitForFunction(
          (t) => (window as any).orvioAudioTime >= t,
          x.time,
          { polling: 1 },
        );
        await page.keyboard.press(keys[x.lane]);
      }
      await expect.poll(async () => (await fx()).pixelStep).toBeGreaterThan(1);
      await page.screenshot({
        path: 'test-results/pixel-active-' + fader + '.png',
      });
      await expect
        .poll(async () => (await fx()).pixelStep, { timeout: 5000 })
        .toBe(1);
    }
    expect(
      await page.evaluate(() =>
        (window as any).orvioDiagnostics.notes.map((s: any) => s.note),
      ),
    ).toEqual(chart);
    await page.screenshot({ path: 'test-results/effect-' + fader + '.png' });
  }
});
