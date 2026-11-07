import { test, expect } from '@playwright/test';
import { LANGUAGES } from '../src/i18n';
test('all translated patch-note bodies have usable readable font coverage', async ({
  page,
}) => {
  for (const lang of Object.keys(LANGUAGES)) {
    await page.goto('/patch-notes/?lang=' + lang);
    await page.evaluate(() => document.fonts.ready);
    const body = page.locator(`[data-language=${lang}]`);
    await expect(body).toBeVisible();
    expect(await body.locator('article').count()).toBe(15);
    await page.screenshot({
      path: `test-results/orvio-patch-final-${lang}.png`,
    });
  }
});
