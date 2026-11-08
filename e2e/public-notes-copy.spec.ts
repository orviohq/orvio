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
    await expect(body.locator('.empty-group')).toHaveCount(0);
    const groups = await body
      .locator('[data-patch-group]')
      .evaluateAll((es) => es.map((e) => e.querySelectorAll('li').length));
    expect(groups.every((n) => n > 0)).toBe(true);
    await expect(body.locator('[data-patch-group=fixes]')).not.toHaveCount(0);
    await page.screenshot({ path: `/downloads/notes-clean-${language}.png` });
  }
});
