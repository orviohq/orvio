import { test, expect } from '@playwright/test';
test('high speed uses one continuous note footprint and keeps input chart intact', async ({
  page,
}) => {
  await page.goto('/play/first-light/7/high/?speed=9');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.waitForFunction(() => (window as any).orvioAudioTime > 3);
  const before = await page.evaluate(() =>
    (window as any).orvioDiagnostics.notes.map((s: any) => s.note),
  );
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(90);
    await page
      .locator('#highway')
      .screenshot({ path: `test-results/motion-${i}.png` });
  }
  await page.keyboard.press('Escape');
  const after = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(after.notes.map((s: any) => s.note)).toEqual(before);
  expect(after.settings.speed).toBe(9);
  await page.screenshot({ path: 'test-results/motion-paused.png' });
});
