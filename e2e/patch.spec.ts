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
  // Observe the intended judgment in the rendering page. A later automation
  // read can arrive after the next unplayed note has correctly become BREAK.
  await page.evaluate(() => {
    (window as any).targetPerfect = undefined;
    const observer = new MutationObserver(() => {
      const event = (window as any).orvioDiagnostics.events[0];
      if (!event) return;
      (window as any).targetPerfect = {
        event,
        judge: document.querySelector('#judge')!.className,
        impact: document.querySelector('#impact')!.className,
      };
      observer.disconnect();
    });
    observer.observe(document.querySelector('#judge')!, {
      childList: true,
      attributes: true,
      characterData: true,
    });
  });
  await atKey(page, note.time, ['d', 'f', 'Space', 'j', 'k'][note.lane], true);
  await page.waitForFunction(() => (window as any).targetPerfect);
  const sample = await page.evaluate(() => (window as any).targetPerfect);
  expect(sample.event.noteId).toBe(note.id);
  expect(sample.event.value).toBe(100);
  expect(Math.abs(sample.event.delta)).toBeLessThanOrEqual(41.67);
  expect(sample.judge).toBe('perfect');
  expect(sample.impact).toBe('');
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
