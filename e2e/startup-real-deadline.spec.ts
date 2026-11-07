import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('real 30 second startup deadline recovers with no source start', async ({
  page,
}) => {
  test.setTimeout(38000);
  await page.goto('/play/first-light/5/low/');
  await page.evaluate(() => {
    AudioContext.prototype.resume = () => new Promise<void>(() => {});
  });
  const start = Date.now();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cancel-startup')).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('startup-recovery-cancel-ui.png'),
  });
  await expect(page.locator('#song-loading')).toBeHidden({ timeout: 33000 });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(29500);
  expect(elapsed).toBeLessThan(32000);
  await expect(page.locator('#start')).toBeEnabled();
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.audioActive),
  ).toBe(false);
  fs.writeFileSync(
    test.info().outputPath('startup-recovery-real-deadline.json'),
    JSON.stringify({ elapsed }, null, 2),
  );
});
