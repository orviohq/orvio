import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('A5 countdown stays cleared after live speed decrease', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/low/?speed=9');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const first = await page.evaluate(
    () => (window as any).orvioDiagnostics.notes[0].note.time,
  );
  const oldFall = first - 2 / 9,
    newFall = first - 2;
  await page.keyboard.press('F3');
  await page.locator('.icon-options-speed [data-value="1"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await page.click('#resume');
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.paused === false,
  );
  await page.waitForFunction(
    (t) => (window as any).orvioAudioTime > t,
    newFall + 0.2,
    { polling: 1 },
  );
  await page.screenshot({ path: test.info().outputPath('a5-speed-fixed.png') });
  const e = await page.evaluate(() => ({
    clock: (window as any).orvioDiagnostics.clock,
    speed: (window as any).orvioDiagnostics.settings.speed,
    count: document.querySelector('#countdown')?.textContent,
  }));
  expect(e.clock).toBeGreaterThan(newFall);
  expect(e.clock).toBeLessThan(oldFall);
  expect(e.count).toBe('');
  fs.writeFileSync(
    test.info().outputPath('a5-speed-fixed.json'),
    JSON.stringify({ first, oldFall, newFall, e }, null, 2),
  );
});
