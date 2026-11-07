import { test, expect } from '@playwright/test';
test('home click and Enter keep fullscreen across selection and denied request remains playable', async ({
  page,
}) => {
  await page.goto('/');
  const marker = await page.evaluate(
    () => ((window as any).sameDocument = Math.random()),
  );
  await page.click('#home-start');
  await expect(page).toHaveURL(/\/select\//);
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  expect(await page.evaluate(() => (window as any).sameDocument)).toBe(marker);
  await page.evaluate(() => document.exitFullscreen());
  await expect(page.locator('#lobby')).toBeVisible();
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.evaluate(() => document.exitFullscreen());
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () =>
      Promise.reject(new DOMException('denied', 'NotAllowedError'));
  });
  await page.click('#home-start');
  await expect(page.locator('#lobby')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
});
