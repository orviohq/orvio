import { test, expect } from '@playwright/test';
import { LANGUAGES } from '../src/i18n';
test('thirteen-language layout states, fixed binding capture size, symbols and miniature position controls', async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1280])
    for (const language of Object.keys(LANGUAGES)) {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (l) =>
          localStorage.setItem(
            'orvio.settings.v1',
            JSON.stringify({ language: l, languageMode: 'manual' }),
          ),
        language,
      );
      await page.goto('/select/');
      await page.click('#open-settings');
      const dims = () =>
        page.locator('.binding-keys .key-bind').evaluateAll((es) =>
          es.map((e) => ({
            w: e.getBoundingClientRect().width,
            y: e.getBoundingClientRect().y,
            x: e.getBoundingClientRect().x,
            h: e.getBoundingClientRect().height,
          })),
        );
      const before = await dims();
      await page.locator('[data-keymode="5"][data-slot="0"]').click();
      expect(await dims()).toEqual(before);
      await expect(
        page.locator('#bind-hint>span[aria-hidden=false]'),
      ).toContainText(/KEY/);
      await expect(page.locator('.listening')).toHaveText('●');
      await page.keyboard.press(',');
      await page.keyboard.press('.');
      await page.keyboard.press('/');
      await page.keyboard.press('Space');
      await page.keyboard.press('Escape');
      await expect(
        page.locator('[data-keymode="5"][data-slot="0"]'),
      ).toHaveText(',');
      await expect(
        page.locator('[data-keymode="5"][data-slot="1"]'),
      ).toHaveText('.');
      await expect(
        page.locator('[data-keymode="5"][data-slot="2"]'),
      ).toHaveText('/');
      await expect(
        page.locator('[data-keymode="5"][data-slot="3"]'),
      ).toHaveText('␣');
      await expect(page.locator('.position-preview')).toHaveCount(3);
      await expect(page.locator('[data-pos="left"]')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(
        await page
          .locator('#settings')
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      ).toBe(true);
      if ([390, 1280].includes(width))
        await page.screenshot({
          path: `test-results/settings-${language}-${width}.png`,
        });
      await page.keyboard.press('Escape');
      await page.keyboard.press('F3');
      await expect(page.locator('#game-options')).toBeVisible();
      expect(
        await page
          .locator('#game-options')
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      ).toBe(true);
      await page.keyboard.press('Escape');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
});
test('all releases and languages on website with safe small-screen layout', async ({
  page,
}) => {
  for (const lang of Object.keys(LANGUAGES)) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/patch-notes/?lang=' + lang);
    await expect(page.locator('[data-language]:visible article')).toHaveCount(
      11,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator('#patch-language')).toHaveValue(lang);
    await page.screenshot({ path: `test-results/patch-notes-${lang}.png` });
  }
});
