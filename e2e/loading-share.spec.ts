import { test, expect } from '@playwright/test';
test('original song loading precedes scoring and sends no result before explicit share', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const resultRequests: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/result'))
      resultRequests.push(r.url());
  });
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#song-loading')).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.active),
  ).toBe(false);
  await page.screenshot({ path: '/downloads/orvio025-loading.png' });
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#song-loading')).toBeHidden();
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  expect(resultRequests).toEqual([]);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    }),
  );
  await page.click('#share-result');
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('/result/?v=1&song=first-light');
  expect(url).toContain('score=0');
  expect(new URL(url).searchParams.size).toBe(7);
  expect(resultRequests).toEqual([]);
  await page.screenshot({ path: '/downloads/orvio025-share.png' });
});
