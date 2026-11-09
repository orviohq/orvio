import { atKey } from './input';
import { test, expect } from '@playwright/test';
const diag = (page: any) =>
  page.evaluate(() => (window as any).orvioDiagnostics);
test('wrong key, misses, late hit, bad hold, duplicate binding, positions and reset', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.click('#open-settings');
  await page.click('[data-slot="0"]');
  await page.keyboard.press('f');
  await expect(page.locator('[data-sonner-toast]')).toContainText('이미');
  await expect(page.locator('[data-slot="3"]')).toContainText('F');
  await page.keyboard.press('a');
  await expect(page.locator('[data-slot="0"]')).toContainText('A');
  for (const pos of ['left', 'center', 'right']) {
    await page.click(`[data-pos="${pos}"]`);
    await page.locator('#settings .close').click();
    await page.click('#start');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    await expect(page.locator('#arena')).toHaveAttribute('data-position', pos);
    await page.keyboard.press('Escape');
    await page.click('#pause-exit');
    expect((await diag(page)).active).toBeFalsy();
    await page.click('#open-settings');
  }
  await page.click('#reset');
  await expect(page.locator('[data-slot="0"]')).toContainText('A');
  await page.locator('#settings .close').click();
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const notes = (await diag(page)).notes.map((s: any) => s.note);
  const keys = ['s', 'd', 'f', 'g', 'h'];
  await page.keyboard.press('q');
  expect((await diag(page)).resolved).toBe(0);
  // Skip first note; hit a later non-hold 75ms late; release the first subsequent hold early.
  const late = notes.find((n: any) => n.id > 1 && !n.end);
  await atKey(page, late.time + 0.075, keys[late.lane], true);
  await atKey(page, late.time + 0.077, keys[late.lane], false);
  const hold = notes.find((n: any) => n.time > late.time + 0.3 && n.end);
  await atKey(page, hold.time, keys[hold.lane], true);
  await atKey(page, hold.time + 0.12, keys[hold.lane], false);
  await page.waitForTimeout(250);
  const d = await diag(page);
  expect(
    d.events.some((e: any) => e.noteId === 0 && e.value === 0),
  ).toBeTruthy();
  expect(
    d.events.some(
      (e: any) => e.noteId === late.id && e.value > 0 && e.value < 100,
    ),
  ).toBeTruthy();
  expect(
    d.events.some((e: any) => e.noteId === hold.id && e.tail && e.value === 0),
  ).toBeTruthy();
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await page.click('[data-song="1"]');
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.previewActive,
  );
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect((await diag(page)).score).toBe(0);
  expect((await diag(page)).resolved).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await diag(page)).paused).toBeTruthy();
  await page.click('#pause-exit');
  expect((await diag(page)).active).toBeFalsy();
  // Returning to selection intentionally resumes the selected-track preview.
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.previewActive,
  );
  await expect(page.locator('#lobby')).toBeVisible();
});
