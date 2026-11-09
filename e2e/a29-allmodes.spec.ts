import { test, expect } from '@playwright/test';
test('all builtin modes play with exact contiguous physical keycaps and no page errors', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const [mode, keys] of [
    [4, ['D', 'F', 'G', 'H']],
    [5, ['S', 'D', 'F', 'G', 'H']],
    [6, ['S', 'D', 'F', 'G', 'H', 'J']],
    [7, ['A', 'S', 'D', 'F', 'G', 'H', 'J']],
    [8, ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K']],
  ] as const) {
    await page.goto(`/play/first-light/${mode}/low/`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() =>
      Boolean((window as any).orvioDiagnostics?.active),
    );
    expect(await page.locator('#keycaps span').allTextContents()).toEqual(keys);
    await page.waitForTimeout(1500);
    if (mode === 8)
      await page.screenshot({
        path: testInfo.outputPath('a29-builtin8-active.png'),
      });
    await page.keyboard.press(keys[0]);
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause')).toBeVisible();
    await page.click('#pause-exit');
  }
  expect(errors).toEqual([]);
});
test('custom old layouts survive reload; master remap propagates subsets without touching legacy override', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(
        'orvio.settings.v1',
        JSON.stringify({
          keys: {
            5: ['KeyQ', 'KeyW', 'Space', 'KeyE', 'KeyR'],
            7: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'],
          },
        }),
      );
      sessionStorage.setItem('seeded', '1');
    }
  });
  await page.goto('/select/');
  await page.keyboard.press('F2');
  await expect(page.locator('.binding-override')).toBeVisible();
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'Q',
    'W',
    '␣',
    'E',
    'R',
  ]);
  await page.click('[data-preview-mode="8"]');
  await page.click('[data-slot="0"]');
  await page.keyboard.press('KeyZ');
  await expect(page.locator('.binding-preview kbd').first()).toHaveText('Z');
  await page.reload();
  await page.keyboard.press('F2');
  await page.click('[data-preview-mode="8"]');
  await expect(page.locator('.binding-preview kbd').first()).toHaveText('Z');
  await page.click('[data-preview-mode="5"]');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'Q',
    'W',
    '␣',
    'E',
    'R',
  ]);
});
test('settings mode preview never changes the paused chart or replay lane count', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  await page.keyboard.press('Escape');
  await page.click('#pause-settings');
  await page.click('[data-preview-mode="8"]');
  await expect(page.locator('.binding-preview kbd')).toHaveCount(8);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.settings.lanes),
  ).toBe(5);
  await page.keyboard.press('Escape');
  if (await page.locator('#pause').isVisible()) await page.click('#resume');
  await expect(page.locator('#keycaps span')).toHaveCount(5);
});
