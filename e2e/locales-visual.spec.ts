import { test, expect } from '@playwright/test';
import { LANGUAGES, translations, type Language } from '../src/i18n';
const languages = Object.keys(LANGUAGES) as Language[];
async function language(page: any, l: Language) {
  await page.evaluate((lang: string) => {
    Object.defineProperty(navigator, 'languages', {
      get: () => [lang],
      configurable: true,
    });
    window.dispatchEvent(new Event('languagechange'));
  }, l);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('html')).toHaveAttribute('lang', l);
}
test('all thirteen home, selection, ready and settings layouts', async ({
  page,
}) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const l of languages) {
      await language(page, l);
      await expect(page.locator('#home-start')).toContainText(
        translations[l].start,
      );
      await page.screenshot({ path: `test-results/home-${l}-${width}.png` });
    }
    await page.goto('/select/');
    for (const l of languages) {
      await language(page, l);
      await page.screenshot({ path: `test-results/select-${l}-${width}.png` });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto('/play/first-light/7/high/');
    for (const l of languages) {
      await language(page, l);
      await page.screenshot({ path: `test-results/ready-${l}-${width}.png` });
      await page.keyboard.press('F3');
      await page.screenshot({
        path: `test-results/game-options-${l}-${width}.png`,
      });
      expect(
        await page
          .locator('#game-options')
          .evaluate((e) => e.scrollWidth <= e.clientWidth),
      ).toBe(true);
      await page.keyboard.press('Escape');
    }
  }
});
test('all thirteen playing, pause, shuffle restart and actual result layouts', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/play/first-light/7/high/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  for (const l of languages) {
    await language(page, l);
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause')).toBeVisible();
    await page.screenshot({ path: `test-results/pause-${l}.png` });
    await page.click('#resume');
    await page.waitForFunction(
      () => (window as any).orvioDiagnostics.paused === false,
    );
  }
  await page.keyboard.press('F3');
  await page.locator('.icon-options-shuffle [data-value="mirror"]').click();
  await page.click('#options-done');
  for (const l of languages) {
    await language(page, l);
    await expect(page.locator('#restart-options')).toBeVisible();
    await page.screenshot({ path: `test-results/restart-${l}.png` });
  }
  await page.click('#cancel-shuffle-restart');
  await page.click('#resume');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const l of languages) {
      await language(page, l);
      await expect(page.locator('#share-status')).toBeHidden();
      await expect(page.locator('#share-result')).toHaveAccessibleName(
        translations[l].shareResult,
      );
      await page.screenshot({ path: `test-results/results-${l}-${width}.png` });
      await page.locator('#retry').scrollIntoViewIfNeeded();
      const rects = await page
        .locator('.result-actions button')
        .evaluateAll((es) =>
          es.map((e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
          }),
        );
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i],
            b = rects[j];
          expect(
            a.right <= b.x ||
              b.right <= a.x ||
              a.bottom <= b.y ||
              b.bottom <= a.y,
          ).toBe(true);
        }
      if (width === 390)
        await page.screenshot({ path: `test-results/results-bottom-${l}.png` });
      expect(
        await page
          .locator('#results')
          .evaluate((e) => e.scrollWidth <= e.clientWidth),
      ).toBe(true);
    }
  }
});
