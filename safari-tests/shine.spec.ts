import { test, expect } from '@playwright/test';
test('real perfect judgment uses text glow without stacked filters', async ({
  page,
}, info) => {
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics.active),
  );
  const note = await page.evaluate(
    () => (window as any).orvioDiagnostics.notes[0].note,
  );
  await page.evaluate((n) => {
    const step = () => {
      if ((window as any).orvioAudioTime < n.time) {
        setTimeout(step, 1);
        return;
      }
      const key = ['KeyD', 'KeyF', 'KeyG', 'KeyJ', 'KeyK'][n.lane];
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: key, bubbles: true }),
      );
    };
    step();
  }, note);
  await expect(page.locator('#judge')).toHaveText('MAX 100%');
  expect(
    await page.locator('#judge').evaluate((e) => getComputedStyle(e).filter),
  ).toBe('none');
  await page.screenshot({ path: info.outputPath('perfect-glow.png') });
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
});
