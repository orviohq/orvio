import { test, expect } from '@playwright/test';
test('browser language defaults, unsupported fallback, manual override and auto reset', async ({
  browser,
}) => {
  for (const [locale, expected] of [
    ['fr-FR', 'en'],
    ['en-GB', 'en'],
    ['ko-KR', 'ko'],
    ['zh-TW', 'zh'],
    ['ja-JP', 'ja'],
    ['es-MX', 'es'],
  ]) {
    const c = await browser.newContext({ locale });
    const p = await c.newPage();
    await p.goto('/select/');
    await expect(p.locator('html')).toHaveAttribute('lang', expected);
    await p.click('#open-settings');
    await expect(p.locator('#language')).toHaveValue('auto');
    await p.selectOption('#language', 'ja');
    await p.reload();
    await expect(p.locator('html')).toHaveAttribute('lang', 'ja');
    await p.click('#open-settings');
    await p.selectOption('#language', 'auto');
    await expect(p.locator('html')).toHaveAttribute('lang', expected);
    await p.keyboard.press('Escape');
    await p.locator('.footer-strip [data-patch-link]').click();
    await expect(p.locator('html')).toHaveAttribute('lang', expected);
    await c.close();
  }
});
test('legacy non-grid speed remains exact and labeled until user selects a half-step', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('orvio.settings.v1', JSON.stringify({ speed: 1.6 })),
  );
  await page.goto('/select/');
  await page.keyboard.press('F3');
  await expect(page.locator('#speed')).toHaveValue('1.6');
  await expect(page.locator('#speed option:checked')).toContainText('기존 값');
  await page.selectOption('#speed', '2');
  await expect(page.locator('#speed option[value="1.6"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/speed=2.0/);
  await page.goto('/play/first-light/5/low/?speed=2.3');
  await page.keyboard.press('F3');
  await expect(page.locator('#speed')).toHaveValue('2.3');
  await expect(page.locator('#speed option:checked')).toContainText('기존 값');
});
