import { test, expect } from '@playwright/test';

// Current 0.2.50 production contract for system settings and per-song game
// options: both persist to localStorage orvio.settings.v1 across a full
// reload, and the keys tab shows real physical keycap rows. Behavior intent
// inherited from the retired options.spec (settings separate, saved,
// defaults) with current selectors - no ../src imports, no host fixtures.
// Dialogs are opened via their visible header/ready buttons; the F2/F3
// keyboard shortcuts are screen-gated wiring in main.ts.

test('settings persist language across reload and keys tab shows current bindings', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.click('#open-settings');
  const settings = page.locator('#settings');
  await expect(settings).toBeVisible();

  // Keys section: current binding contract (data-slot rows with kbd keycaps).
  // On desktop widths all sections are visible; tab buttons are narrow-only.
  await expect(page.locator('#settings-keys')).toBeVisible();
  expect(
    await page.locator('#settings-keys [data-slot]').count(),
  ).toBeGreaterThan(0);
  await expect(
    page.locator('#settings-keys .binding-preview kbd').first(),
  ).toBeVisible();

  // General section: change language away from default, close, reload.
  const language = page.locator('#language');
  await expect(language).toHaveValue('auto');
  await language.selectOption('de');
  await page.keyboard.press('Escape');
  await expect(settings).toBeHidden();
  await page.reload();
  await page.click('#open-settings');
  await expect(page.locator('#language')).toHaveValue('de');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('orvio.settings.v1') || '{}'),
  );
  expect(saved.language).toBe('de');
});

test('game options dialog opens in play and reflects persisted settings', async ({
  page,
}) => {
  await page.goto('/play/first-light/4/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active, {
    timeout: 30000,
  });
  // F3 wiring (main.ts) opens the game-options dialog during play.
  await page.keyboard.press('F3');
  const options = page.locator('#game-options');
  await expect(options).toBeVisible();
  const speed = await page.locator('#speed').inputValue();
  // Persisted store and dialog agree; store survives a reload.
  const read = async () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem('orvio.settings.v1') || '{}').speed,
    );
  expect(Number(speed)).toBe(await read());
  await page.keyboard.press('Escape');
  await page.reload();
  expect(await read()).toBe(Number(speed));
});
