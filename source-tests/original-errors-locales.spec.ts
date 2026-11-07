import { test, expect } from '@playwright/test';
test('all 13 import dialogs translate and show distinct invalid, duration, busy and quota recovery without library mutation', async ({
  browser,
}) => {
  for (const locale of [
    'en',
    'ko',
    'zh',
    'ja',
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
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    let code = 'too_long',
      status = 400;
    await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
      r.fulfill({
        status,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: { code, retryAfterSec: 30 } }),
      }),
    );
    await page.goto('/select/');
    await page.click('#add-youtube');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    const title = await page.locator('#youtube-heading').textContent();
    expect(title).toBeTruthy();
    if (locale !== 'en') expect(title).not.toBe('Add YouTube');
    await page.fill('#youtube-url', 'https://example.com/wrong');
    await page.click('#youtube-submit');
    const invalid = await page.locator('#youtube-status').textContent();
    expect(invalid).toBeTruthy();
    await page.fill('#youtube-url', 'https://youtu.be/uXn-zOt68V8');
    await page.click('#youtube-submit');
    await expect(page.locator('#youtube-status')).not.toHaveText(invalid!);
    await expect(page.locator('#youtube-submit')).toBeEnabled();
    const duration = await page.locator('#youtube-status').textContent();
    expect(duration).toMatch(/2/);
    code = 'unavailable';
    status = 429;
    await page.click('#youtube-submit');
    await expect(page.locator('#youtube-status')).toContainText('30');
    const busy = await page.locator('#youtube-status').textContent();
    code = 'rate_limited';
    await page.click('#youtube-submit');
    await expect(page.locator('#youtube-submit')).toBeEnabled();
    await expect(page.locator('#youtube-status')).not.toHaveText(busy!);
    expect(await page.locator('#youtube-status').textContent()).not.toBe(
      invalid,
    );
    await expect(page.locator('.song-card')).toHaveCount(3);
    await page.keyboard.press('Escape');
    await expect(page.locator('#youtube-import')).not.toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await context.close();
  }
});
test('mobile input is usable without promising touchscreen gameplay', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
  });
  const page = await context.newPage();
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/uXn-zOt68V8');
  await page.screenshot({ path: 'test-results/original-youtube-mobile.png' });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  const box = await page.locator('#youtube-submit').boundingBox();
  expect(box!.width).toBeGreaterThan(250);
  expect(box!.y + box!.height).toBeLessThan(844);
  await context.close();
});
