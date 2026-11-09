import { test, expect } from '@playwright/test';
// Nov8A29 unified4-8 master UI supersedes separate rows; preserve repeat/cancel/persistence.
test('unified master capture: consecutive keys, repeat/duplicate rejection, cancel, persistence', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.keyboard.press('F2');
  await expect(page.locator('#settings')).toBeVisible();
  // Tabs render only under the small-screen media query; desktop shows both sections.
  if (await page.locator('#settings-keys-tab').isVisible())
    await page.click('#settings-keys-tab');
  const slot = (i: number) => page.locator(`#bindings [data-slot="${i}"]`);
  await expect(page.locator('#bindings [data-slot]')).toHaveCount(8);
  await expect(page.locator('#bindings [data-preview-mode]')).toHaveCount(5);
  await expect(page.locator('#binding-mode')).toHaveText('4 - 8 KEY');
  // consecutive capture into master positions 1..5 (the 5K lane positions)
  const keys: [number, string, string][] = [
    [1, 'n', 'N'],
    [2, 'm', 'M'],
    [3, ',', ','],
    [4, '.', '.'],
    [5, '/', '/'],
  ];
  for (const [i, key, label] of keys) {
    await slot(i).click();
    await expect(slot(i)).toHaveClass(/listening/);
    await page.keyboard.press(key);
    await expect(slot(i)).toHaveText(new RegExp(label === ',' ? ',' : label));
  }
  await expect(page.locator('.listening')).toHaveCount(0);
  // repeat safety: one physical press-and-hold = one assignment, no cascade
  await slot(6).click();
  await page.keyboard.down('s');
  await page.keyboard.down('s');
  await page.keyboard.up('s');
  await expect(slot(6)).toHaveText(/S/);
  await expect(page.locator('.listening')).toHaveCount(0);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  // duplicate rejection keeps slot + stays listening; Escape cancels
  await slot(7).click();
  await page.keyboard.press('a');
  await expect(page.locator('[data-sonner-toast]')).toContainText('이미');
  await expect(slot(7)).toHaveClass(/listening/);
  // While listening the button shows index+dot; the key survives in the label.
  await expect(slot(7)).toHaveAttribute('aria-label', /8: K/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).toBeVisible();
  await expect(page.locator('.listening')).toHaveCount(0);
  await expect(slot(7)).toHaveText(/K/);
  // mode previews resolve from master positions (5K = positions 1..5)
  await page.click('[data-preview-mode="5"]');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'N',
    'M',
    ',',
    '.',
    '/',
  ]);
  // persistence across reload
  await page.keyboard.press('Escape');
  await page.reload();
  await page.keyboard.press('F2');
  // Tabs render only under the small-screen media query; desktop shows both sections.
  if (await page.locator('#settings-keys-tab').isVisible())
    await page.click('#settings-keys-tab');
  await expect(slot(1)).toHaveText(/N/);
  await expect(slot(6)).toHaveText(/S/);
  await page.keyboard.press('Escape');
  await page.locator('#start').click();
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.keyboard.press('Escape');
  await page.keyboard.press('F2');
  if (await page.locator('#settings-keys-tab').isVisible())
    await page.click('#settings-keys-tab');
  await slot(7).click();
  await page.keyboard.press('z');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await expect(page.locator('#resume')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.paused === false,
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('F2');
  if (await page.locator('#settings-keys-tab').isVisible())
    await page.click('#settings-keys-tab');
  await page.click('[data-preview-mode="5"]');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'N',
    'M',
    ',',
    '.',
    '/',
  ]);
});

test('legacy saved custom modes migrate to exact per-mode overrides, editable and resettable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'orvio.settings.v1',
      JSON.stringify({
        keys: {
          5: ['KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
          7: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU'],
        },
      }),
    );
  });
  await page.goto('/select/');
  await page.keyboard.press('F2');
  // Tabs render only under the small-screen media query; desktop shows both sections.
  if (await page.locator('#settings-keys-tab').isVisible())
    await page.click('#settings-keys-tab');
  await page.click('[data-preview-mode="5"]');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'N',
    'M',
    ',',
    '.',
    '/',
  ]);
  await expect(
    page.locator('.binding-override [data-legacy-slot]'),
  ).toHaveCount(5);
  await page.click('[data-preview-mode="7"]');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'Q',
    'W',
    'E',
    'R',
    'T',
    'Y',
    'U',
  ]);
  await expect(
    page.locator('.binding-override [data-legacy-slot]'),
  ).toHaveCount(7);
  // 4K has no override: falls back to master positions 2..5 (A S D F)
  await page.click('[data-preview-mode="4"]');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'D',
    'F',
    'G',
    'H',
  ]);
  // edit one override slot, master untouched
  await page.click('[data-preview-mode="5"]');
  await page.locator('.binding-override [data-legacy-slot="0"]').click();
  await page.keyboard.press('z');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'Z',
    'M',
    ',',
    '.',
    '/',
  ]);
  await expect(page.locator('#bindings [data-slot="1"]')).toHaveText(/S/);
  // reset restores master-derived bindings for that mode
  await page.click('#use-common-bindings');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'S',
    'D',
    'F',
    'G',
    'H',
  ]);
  // migration persisted: reload keeps 7K override
  await page.keyboard.press('Escape');
  await page.reload();
  await page.keyboard.press('F2');
  // Tabs render only under the small-screen media query; desktop shows both sections.
  if (await page.locator('#settings-keys-tab').isVisible())
    await page.click('#settings-keys-tab');
  await page.click('[data-preview-mode="7"]');
  await expect(page.locator('.binding-preview kbd')).toHaveText([
    'Q',
    'W',
    'E',
    'R',
    'T',
    'Y',
    'U',
  ]);
});
