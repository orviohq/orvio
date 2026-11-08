import { test, expect } from '@playwright/test';
test('patch notes use a new tab; icon radio options, terms, all effects and song wallpaper are real', async ({
  page,
}) => {
  await page.goto('/select/?lang=ko');
  await expect(page.locator('[data-patch-link]').first()).toHaveAttribute(
    'target',
    '_blank',
  );
  await page.keyboard.press('F3');
  await expect(page.locator('#speed-label')).toContainText('노트 속도');
  await expect(page.locator('#game-options')).toContainText('노트 효과');
  await expect(page.locator('#game-options [role=combobox]')).toHaveCount(0);
  await expect(page.locator('.icon-options-fader [role=radio]')).toHaveCount(
    11,
  );
  await page.locator('.icon-options-fader [data-value=blink]').click();
  await expect(
    page.locator('.icon-options-fader [data-value=blink]'),
  ).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#fader')).toHaveValue('blink2');
  await page.screenshot({ path: 'test-results/012-icon-options.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#game')).toHaveAttribute(
    'data-song',
    'first-light',
  );
  expect(
    await page
      .locator('#game')
      .evaluate((e) => getComputedStyle(e).backgroundImage),
  ).toContain('/wallpapers/first-light.png');
  await page.screenshot({ path: 'test-results/012-wallpaper-playing.png' });
});
test('warm starts preserve decoded wallpaper presentation before the clock', async ({
  page,
}) => {
  await page.goto('/play/afterimage/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  const at = await page.evaluate(() => performance.now());
  await page.keyboard.press('Enter');
  await expect(page.locator('#song-loading')).toBeVisible();
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.active),
  ).toBe(false);
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect(
    (await page.evaluate(() => performance.now())) - at,
  ).toBeGreaterThanOrEqual(1180);
  await expect(page.locator('#song-loading')).toBeHidden();
  await expect(page.locator('#game')).toBeVisible();
});
