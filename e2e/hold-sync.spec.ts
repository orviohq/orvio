import { atKey } from './input';
import { test, expect } from '@playwright/test';
test('legacy calibration removed and held body stays visible past head culling', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('orvio.settings.v1', JSON.stringify({ offset: 150 })),
  );
  await page.goto('/select/');
  await page.click('#open-settings');
  await expect(page.locator('#offset')).toHaveCount(0);
  await expect(page.locator('#settings')).toContainText('자동으로');
  expect(
    await page.evaluate(
      () => 'offset' in JSON.parse(localStorage.getItem('orvio.settings.v1')!),
    ),
  ).toBe(false);
  await page.screenshot({ path: 'test-results/automatic-settings.png' });
  await page.locator('#settings .close').click();
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const n = await page.evaluate(
    () =>
      (window as any).orvioDiagnostics.notes.find((s: any) => s.note.end).note,
  );
  const keys = ['d', 'f', 'Space', 'j', 'k'];
  await atKey(page, n.time, keys[n.lane], true);
  await page.waitForFunction(
    (t) => (window as any).orvioDiagnostics.clock >= t,
    n.time + 0.5,
    { polling: 'raf' },
  );
  const during = await page.evaluate((id) => {
    const d = (window as any).orvioDiagnostics;
    return {
      state: d.notes.find((s: any) => s.note.id === id),
      events: d.events,
      clock: d.clock,
      latency: d.outputLatency,
    };
  }, n.id);
  expect(during.state.held).toBe(true);
  expect(during.state.done).toBe(false);
  expect(
    Math.abs(
      during.events.find((e: any) => e.noteId === n.id && !e.tail).delta,
    ),
  ).toBeLessThan(45);
  // Do not take a screenshot between head and tail: capture latency can exceed
  // the remaining hold on a loaded runner and delay the real key-up event.
  await atKey(page, n.end, keys[n.lane], false);
  const tail = await page.evaluate(
    (id) =>
      (window as any).orvioDiagnostics.events.find(
        (e: any) => e.noteId === id && e.tail,
      ),
    n.id,
  );
  expect(tail.value).toBe(100);
  expect(Math.abs(tail.delta)).toBeLessThan(45);
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
});
