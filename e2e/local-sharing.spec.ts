import { mockShare } from './share-mock';
import { test, expect } from '@playwright/test';
import { LANGUAGES, translations, type Language } from '../src/i18n';
const data =
  'v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1';
test('local fragments never reach requests; copy succeeds or visibly fails in thirteen languages', async ({
  page,
  context,
}) => {
  const shared = await mockShare(context);
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
    await expect(page.locator('#toast')).toHaveText(
      translations[l].resultCopied,
    );
    await expect(page.locator('#toast')).toBeVisible();
    expect(
      await page.locator('#toast').evaluate((e) => e.closest('dialog')?.open),
    ).toBe(true);
  }
  await page.screenshot({ path: 'test-results/copy-success.png' });
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
  });
  await page.click('#share-result');
  await expect(page.locator('#toast')).toHaveText(translations.vi.shareFailed);
  await expect(page.locator('#toast')).toBeVisible();
  await page.screenshot({ path: 'test-results/copy-failure.png' });
  await page.goto('/result/?' + data);
  await expect(page.locator('#results')).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toContain('v=3');
});
