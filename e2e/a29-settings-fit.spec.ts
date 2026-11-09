import { test, expect } from '@playwright/test';
import { LANGUAGES } from '../src/i18n';
test('all unified previews keep reset onscreen in every language on compact screens', async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 480],
    [1280, 480],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/select/');
    await page.keyboard.press('F2');
    for (const lang of Object.keys(LANGUAGES)) {
      if (await page.locator('[data-settings-tab="general"]').isVisible())
        await page.click('[data-settings-tab="general"]');
      await page.selectOption('#language', lang);
      if (await page.locator('[data-settings-tab="keys"]').isVisible())
        await page.click('[data-settings-tab="keys"]');
      for (const mode of [4, 5, 6, 7, 8]) {
        await page.click(`[data-preview-mode="${mode}"]`);
        const fits = await page.locator('#settings').evaluate((e) => {
          const d = e.getBoundingClientRect(),
            r = e.querySelector('#reset')!.getBoundingClientRect();
          return {
            noScroll: e.scrollHeight <= e.clientHeight + 1,
            resetVisible:
              r.top >= d.top && r.bottom <= d.bottom && r.bottom <= innerHeight,
            wide: e.scrollWidth <= e.clientWidth + 1,
          };
        });
        expect(fits, `${width}x${height} ${lang} ${mode}`).toEqual({
          noScroll: true,
          resetVisible: true,
          wide: true,
        });
      }
      if (width === 320 && (lang === 'fr' || lang === 'ru'))
        await page.screenshot({
          path: test.info().outputPath(`a29-settings-fit-${lang}-320.png`),
        });
    }
    await page.locator('#reset').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#reset')).toBeFocused();
    if (width === 390)
      await page.screenshot({
        path: test.info().outputPath('a29-settings-fit-390.png'),
      });
    await page.keyboard.press('Escape');
  }
});
