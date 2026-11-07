import { test, expect } from '@playwright/test';
test('clean UI, no text/image drag, volume and keyboard remain usable', async ({
  page,
}) => {
  await page.goto('/select/');
  expect(
    await page.locator('body').evaluate((e) => getComputedStyle(e).userSelect),
  ).toBe('none');
  expect(
    await page
      .locator('.brand img')
      .first()
      .evaluate((e) =>
        e.dispatchEvent(
          new DragEvent('dragstart', { cancelable: true, bubbles: true }),
        ),
      ),
  ).toBe(false);
  await page.keyboard.press('F2');
  await page.locator('#volume').fill('0.25');
  expect(await page.locator('#volume').inputValue()).toBe('0.25');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('[data-i18n="hold"],#clock-info')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
});
