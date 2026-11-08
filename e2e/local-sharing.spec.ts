import { sonnerResultFixture } from './sonner-fixture';
import { mockShare } from './share-mock';
import { shareLabels } from '../src/share-labels';
import { test, expect } from '@playwright/test';
import { LANGUAGES, translations, type Language } from '../src/i18n';
test('local fragments never reach requests; copy succeeds or visibly fails in thirteen languages', async ({
  page,
  context,
}) => {
  const shared = await mockShare(context);
  const data = await sonnerResultFixture(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/result/#' + data);
  await expect(page.locator('#results')).toBeVisible();
  expect(
    requests.every(
      (u) =>
        !u.includes('score=') && !u.includes('combo=') && !u.includes('j=1'),
    ),
  ).toBe(true);
  for (const l of Object.keys(LANGUAGES) as Language[]) {
    await page.evaluate((lang) => {
      Object.defineProperty(navigator, 'languages', {
        get: () => [lang],
        configurable: true,
      });
      window.dispatchEvent(new Event('languagechange'));
    }, l);
    await page.locator('#share-result').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-sonner-toast]')).toHaveText(
      translations[l].resultCopied,
    );
    await expect(page.locator('[data-sonner-toast]')).toBeVisible();
    expect(
      await page
        .locator('[data-sonner-toast]')
        .evaluate((e) => e.closest('dialog')?.open),
    ).toBe(true);
  }
  await page.screenshot({ path: 'test-results/copy-success.png' });
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
    navigator.clipboard.write = async () => {
      throw new Error('denied');
    };
  });
  await page.click('#share-result');
  await expect(page.locator('[data-sonner-toast]')).toHaveText(
    shareLabels('vi').failed,
  );
  await expect(page.locator('[data-sonner-toast]')).toBeVisible();
  await page.screenshot({ path: 'test-results/copy-failure.png' });
  await page.goto('/result/#' + data);
  await expect(page.locator('#results')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('score')).toBe(false);
});
