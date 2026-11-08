import { mockShare } from './share-mock';
import { test, expect } from '@playwright/test';
test('original song loading precedes scoring and sends no result before explicit share', async ({
  page,
  context,
}) => {
  const shared = await mockShare(context);
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
  await page.screenshot({ path: 'test-results/loading.png' });
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
  const resultURL = page.url();
  expect(resultURL).toContain('/result/#v=4&song=first-light');
  await expect(page.locator('#result-url')).toHaveCount(0);
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'share', {
      value: () => {
        throw new Error('native share must not open');
      },
      configurable: true,
    }),
  );
  await page.click('#share-result');
  await expect(page.locator('[data-sonner-toast]')).toHaveText(
    '링크를 복사했어요',
  );
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('/result/?s=');
  expect(url.length).toBeLessThan(100);
  expect(shared.requests).toHaveLength(1);
  expect(shared.requests[0].body.fragment).toBe(
    new URL(resultURL).hash.slice(1),
  );
  expect(resultRequests).toEqual([]);
  await page.screenshot({ path: 'test-results/sharing.png' });
});
