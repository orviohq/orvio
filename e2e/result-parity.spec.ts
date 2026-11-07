import { test, expect } from '@playwright/test';
test('finished and reopened result are the same view, copy works without a link field', async ({
  page,
  context,
}) => {
  test.setTimeout(70000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  const url = page.url();
  expect(url).toContain('/result/#v=3&');
  await expect(page.locator('#result-url,#share-privacy')).toHaveCount(0);
  const original = await page.locator('#results').screenshot();
  await page.click('#share-result');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  await expect(page.locator('#results #toast')).toBeVisible();
  await expect(page.locator('#toast')).toHaveText('링크를 복사했어요');
  await page.waitForFunction(
    () => !document.querySelector('#toast')?.classList.contains('visible'),
  );
  await page.reload();
  await expect(page.locator('#results')).toBeVisible();
  expect(await page.locator('#results').screenshot()).toEqual(original);
  await page.screenshot({ path: 'test-results/result-direct.png' });
  await page.click('#retry');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await page.goto(url);
  await expect(page.locator('#results')).toBeVisible();
  await page.click('#back');
  await expect(page).toHaveURL(/\/select\//);
});
