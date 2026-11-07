import { test, expect } from '@playwright/test';
import { atKey } from './input';
test('equal integer lane widths survive resize and MAX100 has no field overlay', async ({
  page,
}) => {
  for (const lanes of [5, 7]) {
    await page.goto(`/play/first-light/${lanes}/low/`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    for (const width of [1280, 1023, 1441]) {
      await page.setViewportSize({ width, height: 720 });
      await page.waitForTimeout(120);
      const dimensions = await page
        .locator('#highway canvas')
        .evaluate((e) => ({
          width: (e as HTMLCanvasElement).width,
          css: e.getBoundingClientRect().width,
        }));
      expect(dimensions.width % lanes).toBe(0);
      expect(dimensions.css).toBe(dimensions.width);
    }
    await page.keyboard.press('Escape');
    await page.click('#pause-exit');
  }
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const note = await page.evaluate(
    () => (window as any).orvioDiagnostics.notes[0].note,
  );
  await atKey(page, note.time, ['d', 'f', 'Space', 'j', 'k'][note.lane], true);
  await expect(page.locator('#judge')).toHaveClass('perfect');
  await expect(page.locator('#impact')).toHaveAttribute('class', '');
});
test('broken hold has muted remaining tail without score re-entry', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const note = await page.evaluate(
    () =>
      (window as any).orvioDiagnostics.notes.find((s: any) => s.note.end).note,
  );
  const key = ['d', 'f', 'Space', 'j', 'k'][note.lane];
  await atKey(page, note.time, key, true);
  await atKey(page, note.time + 0.15, key, false);
  const before = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(before.notes.find((s: any) => s.note.id === note.id).tail).toBe(0);
  await page.screenshot({ path: 'test-results/failed-hold-remaining.png' });
  await atKey(page, note.time + 0.25, key, true);
  const after = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(after.events.filter((e: any) => e.noteId === note.id).length).toBe(2);
  expect(after.notes.find((s: any) => s.note.id === note.id).done).toBe(true);
});
