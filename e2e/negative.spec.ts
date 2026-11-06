import { test, expect } from '@playwright/test';
const diag = (page: any) =>
  page.evaluate(() => (window as any).orvioDiagnostics);
async function at(page: any, t: number) {
  const now = (await diag(page)).clock;
  if (t > now) await page.waitForTimeout((t - now) * 1000);
}
test('wrong key, misses, late hit, bad hold, duplicate binding, positions and reset', async ({
  page,
}) => {
  await page.goto('/');
  await page.click('#open-settings');
  await page.click('[data-bind="0"]');
  await page.keyboard.press('f');
  await expect(page.locator('#toast')).toContainText('이미');
  await expect(page.locator('[data-bind="1"]')).toHaveText('F');
  await page.keyboard.press('a');
  await expect(page.locator('[data-bind="0"]')).toHaveText('A');
  for (const pos of ['left', 'center', 'right']) {
    await page.click(`[data-pos="${pos}"]`);
    await page.locator('#settings .close').click();
    await page.click('#start');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    await expect(page.locator('#arena')).toHaveAttribute('data-position', pos);
    await page.keyboard.press('Escape');
    expect((await diag(page)).active).toBeFalsy();
    await page.click('#open-settings');
  }
  await page.click('#reset');
  await expect(page.locator('[data-bind="0"]')).toHaveText('D');
  await page.locator('#settings .close').click();
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const notes = (await diag(page)).notes.map((s: any) => s.note);
  const keys = ['d', 'f', 'Space', 'j', 'k'];
  await page.keyboard.press('q');
  expect((await diag(page)).resolved).toBe(0);
  // Skip first note; hit a later non-hold 75ms late; release the first subsequent hold early.
  const late = notes.find((n: any) => n.id > 1 && !n.end);
  await at(page, late.time + 0.075);
  await page.keyboard.press(keys[late.lane]);
  const hold = notes.find((n: any) => n.time > late.time + 0.3 && n.end);
  await at(page, hold.time);
  await page.keyboard.down(keys[hold.lane]);
  await page.waitForTimeout(120);
  await page.keyboard.up(keys[hold.lane]);
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
  await page.click('#preview');
  await page.click('#preview');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect((await diag(page)).score).toBe(0);
  expect((await diag(page)).resolved).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await diag(page)).active).toBeFalsy();
  expect((await diag(page)).audioActive).toBeFalsy();
  expect((await diag(page)).previewActive).toBeFalsy();
  await expect(page.locator('#lobby')).toBeVisible();
});
