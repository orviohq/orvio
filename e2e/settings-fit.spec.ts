import { test, expect } from '@playwright/test';
import { LANGUAGES } from '../src/i18n';
test('settings fit without scroll, all languages and short-screen tabs remain usable', async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 480],
    [1280, 480],
    [768, 600],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/select/');
    await page.keyboard.press('F2');
    for (const lang of Object.keys(LANGUAGES)) {
      await page.selectOption('#language', lang);
      expect(
        await page
          .locator('#settings')
          .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
        `${width}x${height} ${lang}`,
      ).toBe(true);
      await expect(page.locator('#settings [data-i18n="auto"]')).toHaveCount(0);
      if (width === 320) {
        await page.click('[data-settings-tab="keys"]');
        await expect(page.locator('#bindings')).toBeVisible();
        expect(
          await page
            .locator('#settings')
            .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
        ).toBe(true);
        await page.click('[data-settings-tab="general"]');
      }
      if (lang === 'ru' || lang === 'ko')
        await page.screenshot({
          path: `test-results/settings-fit-${lang}-${width}.png`,
        });
    }
    await page.keyboard.press('Escape');
  }
});
