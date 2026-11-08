import { test, expect } from '@playwright/test';
test('both key modes support consecutive keys, repeat rejection, cancel and independent saved rows', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.keyboard.press('F2');
  const slot = (mode: number, index: number) =>
    page.locator(`[data-keymode="${mode}"][data-slot="${index}"]`);
  await expect(page.locator('.binding-row')).toHaveCount(2);
  await slot(5, 0).click();
  await page.keyboard.press('a');
  await expect(slot(5, 1)).toHaveClass(/listening/);
  await page.keyboard.down('s');
  await page.keyboard.down('s');
  await expect(slot(5, 2)).toHaveClass(/listening/);
  await page.keyboard.up('s');
  await page.keyboard.press('a');
  await expect(slot(5, 2)).toHaveClass(/listening/);
  await expect(page.locator('[data-sonner-toast]')).toContainText('이미');
  for (const key of ['g', 'h', 'l']) await page.keyboard.press(key);
  await expect(page.locator('.listening')).toHaveCount(0);
  for (const [i, key] of ['A', 'S', 'G', 'H', 'L'].entries())
    await expect(slot(5, i)).toHaveText(key);
  await slot(7, 0).click();
  for (const key of ['q', 'w', 'e', 'r', 't', 'y', 'u'])
    await page.keyboard.press(key);
  for (const [i, key] of ['Q', 'W', 'E', 'R', 'T', 'Y', 'U'].entries())
    await expect(slot(7, i)).toHaveText(key);
  await slot(5, 2).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).toBeVisible();
  await expect(page.locator('.listening')).toHaveCount(0);
  await expect(slot(5, 2)).toHaveText('G');
  await page.screenshot({ path: 'test-results/key-settings-both.png' });
  await page.keyboard.press('Escape');
  await page.reload();
  await page.keyboard.press('F2');
  await expect(slot(5, 0)).toHaveText('A');
  await expect(slot(7, 0)).toHaveText('Q');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.keyboard.press('Escape');
  await page.keyboard.press('F2');
  await expect(slot(5, 0)).toHaveText('A');
  await expect(slot(7, 0)).toHaveText('Q');
  await slot(7, 0).click();
  await page.keyboard.press('z');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await expect(page.locator('#resume')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.paused === false,
  );
});
