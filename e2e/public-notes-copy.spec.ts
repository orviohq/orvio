import { test, expect } from '@playwright/test';
test('all public patch-note locales show normal copy without private request IDs', async ({
  page,
}) => {
  for (const language of [
    'ko',
    'en',
    'ja',
    'zh',
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
    await page.goto('/patch-notes/?lang=' + language);
    const body = page.locator(`[data-language=${language}]`);
    await expect(body).toBeVisible();
    expect(await body.innerText()).not.toMatch(/\bA\d{1,3}\b/);
    await page.screenshot({ path: `/downloads/notes-clean-${language}.png` });
  }
});
