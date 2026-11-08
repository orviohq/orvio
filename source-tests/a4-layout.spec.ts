import { test, expect } from '@playwright/test';
test('fourfamilies ratingselection remains visible desktop and mobile in13languages', async ({
  page,
}) => {
  await page.goto('/select/?song=violet-drive&difficulty=sc&lanes=7');
  await expect(page.locator('[data-diff=sc]')).toHaveClass(/selected/);
  await expect(page.locator('[data-diff=sc]')).toContainText(/SC \d+/);
  await expect(page.locator('.song-level')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/a4-select-desktop.png' });
  for (const lang of [
    'en',
    'ko',
    'zh',
    'ja',
    'es',
    'fr',
    'de',
    'pt',
    'it',
    'ru',
    'id',
    'tr',
    'vi',
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('#open-settings');
    await page.selectOption('#language', lang);
    await page.keyboard.press('Escape');
    const b = await page.locator('#difficulty').boundingBox();
    expect(b!.x + b!.width).toBeLessThanOrEqual(390);
    await expect(page.locator('[data-diff=sc]')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: 'test-results/a4-select-mobile.png' });
});
