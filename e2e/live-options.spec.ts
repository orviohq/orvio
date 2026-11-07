import { atKey } from './input';
import { test, expect } from '@playwright/test';
test('game option readout, pause edit, cancel shuffle and explicit restart keep chart consistent', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/high/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#play-options')).toContainText('1.5×');
  await expect(page.locator('#play-options svg')).toHaveCount(3);
  await expect(page.locator('#play-options')).toHaveAccessibleName(/F3/);
  const before = await page.evaluate(() => ({
    session: (window as any).orvioDiagnostics.sessionId,
    notes: (window as any).orvioDiagnostics.notes.map((s: any) => s.note),
  }));
  await page.keyboard.press('F3');
  await expect(page.locator('#game-options')).toBeVisible();
  const frozen = await page.evaluate(
    () => (window as any).orvioDiagnostics.clock,
  );
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.clock),
  ).toBeCloseTo(frozen, 2);
  await page.locator('.icon-options-speed [data-value="2.5"]').click();
  await page.locator('.icon-options-fader [data-value="out"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await expect(page.locator('#play-options')).toContainText('2.5×');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.paused === false,
  );
  expect(
    await page.evaluate(() =>
      (window as any).orvioDiagnostics.notes.map((s: any) => s.note),
    ),
  ).toEqual(before.notes);
  await page.click('#play-options');
  await page.locator('.icon-options-shuffle [data-value="mirror"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#restart-options')).toBeVisible();
  await page.click('#cancel-shuffle-restart');
  await expect(page.locator('#pause')).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as any).orvioDiagnostics.settings.shuffle,
    ),
  ).toBe('off');
  await page.keyboard.press('F3');
  await expect(page.locator('#game-options')).toBeVisible();
  await page.locator('.icon-options-shuffle [data-value="mirror"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#restart-options')).toBeVisible();
  await page.click('#confirm-shuffle-restart');
  await page.waitForFunction(
    (old) =>
      (window as any).orvioDiagnostics.active &&
      (window as any).orvioDiagnostics.sessionId !== old,
    before.session,
  );
  const after = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(after.settings.shuffle).toBe('mirror');
  expect(after.clock).toBeLessThan(1);
  for (let i = 0; i < before.notes.length; i++)
    expect(after.notes[i].note.lane).toBe(4 - before.notes[i].lane);
  await page.screenshot({ path: 'test-results/live-options.png' });
});

test('held note survives speed and effect changes without a new chart or remapping', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/high/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const note = await page.evaluate(
    () =>
      (window as any).orvioDiagnostics.notes.find((s: any) => s.note.end).note,
  );
  const key = ['d', 'f', 'Space', 'j', 'k'][note.lane];
  await atKey(page, note.time, key, true);
  await page.keyboard.press('F3');
  await expect(page.locator('#game-options')).toBeVisible();
  const state = await page.evaluate(
    (id) =>
      (window as any).orvioDiagnostics.notes.find((s: any) => s.note.id === id),
    note.id,
  );
  expect(state.held).toBe(true);
  await page.locator('.icon-options-speed [data-value="3"]').click();
  await page.locator('.icon-options-fader [data-value="in2"]').click();
  await page.click('#options-done');
  await expect(page.locator('#pause')).toBeVisible();
  expect(
    await page.evaluate(
      (id) =>
        (window as any).orvioDiagnostics.notes.find(
          (s: any) => s.note.id === id,
        ),
      note.id,
    ),
  ).toEqual(state);
  await page.click('#resume');
  await atKey(page, note.end, key, false);
  const tail = await page.evaluate(
    (id) =>
      (window as any).orvioDiagnostics.events.find(
        (e: any) => e.noteId === id && e.tail,
      ),
    note.id,
  );
  expect(tail.value).toBe(state.head);
  expect(Math.abs(tail.delta)).toBeLessThan(45);
  await page.keyboard.press('F3');
  await page.screenshot({ path: 'test-results/live-hold-options.png' });
});
