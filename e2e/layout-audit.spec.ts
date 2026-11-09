import { test, expect } from '@playwright/test';
import { LANGUAGES, translate, type Language } from '../src/i18n';
import { PATCHES } from '../src/patch-notes';

for (const width of [320, 390, 768, 1280])
  for (const language of Object.keys(LANGUAGES))
    test(`layout binding capture symbols positions ${width}px ${language}`, async ({
      page,
    }) => {
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
      if (await page.locator('#settings-keys-tab').isVisible())
        await page.click('#settings-keys-tab');
      const dims = () =>
        page.locator('.binding-master .key-bind').evaluateAll((es) =>
          es.map((e) => ({
            w: (e as HTMLElement).offsetWidth,
            h: (e as HTMLElement).offsetHeight,
            x: (e as HTMLElement).offsetLeft,
            y: (e as HTMLElement).offsetTop,
          })),
        );
      await page.locator('[data-preview-mode="5"]').click();
      const before = await dims();
      await page.locator('[data-slot="1"]').click();
      expect(await dims()).toEqual(before);
      await expect(page.locator('#bind-hint')).toContainText(
        translate(language as Language, 'listening'),
      );
      await expect(page.locator('.listening')).toContainText('●');
      await page.keyboard.press(',');
      for (const [slot, key] of [
        [2, '.'],
        [3, '/'],
        [4, 'Space'],
      ] as const) {
        await page.locator(`[data-slot="${slot}"]`).click();
        await page.keyboard.press(key);
      }
      for (const [index, symbol] of [',', '.', '/', '␣'].entries())
        await expect(
          page.locator('.binding-preview kbd').nth(index),
        ).toHaveText(symbol);
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
    });
test('all releases and languages on website with safe small-screen layout', async ({
  page,
}) => {
  for (const lang of Object.keys(LANGUAGES)) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/patch-notes/?lang=' + lang);
    await expect(page.locator('[data-language]:visible article')).toHaveCount(
      PATCHES.length,
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
