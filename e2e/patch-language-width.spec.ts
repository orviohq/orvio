import { test, expect } from '@playwright/test';
import { LANGUAGES } from '../src/i18n';
test('patch language control is compact with all names readable and keyboard menu intact', async ({
  page,
}) => {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/patch-notes/?lang=ko');
    const trigger = page.locator('#patch-language-trigger');
    await expect(trigger).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const [lang, name] of Object.entries(LANGUAGES)) {
      await trigger.click();
      const menu = page.locator('#patch-language-menu');
      await expect(menu).toBeVisible();
      await menu.getByRole('option', { name, exact: true }).click();
      await expect(trigger).toHaveText(name);
      await expect(page.locator(`[data-language="${lang}"]`)).toBeVisible();
      const fit = await trigger.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return {
          width: r.width,
          right: r.right,
          overflow: document.documentElement.scrollWidth > innerWidth,
          labelFits: e.scrollWidth <= e.clientWidth,
        };
      });
      expect(fit.width).toBeLessThanOrEqual(181);
      expect(fit.right).toBeLessThanOrEqual(width);
      expect(fit.overflow).toBe(false);
      expect(fit.labelFits).toBe(true);
    }
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#patch-language-menu')).toBeVisible();
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveText(LANGUAGES.en);
    await page.screenshot({
      path: test.info().outputPath(`a18-${width}-closed.png`),
    });
    await trigger.click();
    await page.screenshot({
      path: test.info().outputPath(`a18-${width}-open.png`),
    });
    await page.keyboard.press('Escape');
  }
});
