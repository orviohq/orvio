import { test, expect } from '@playwright/test';
test('home, share, direct play, refresh and history are safe keyboard routes', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await expect(page.locator('#home-start')).toBeVisible();
  await expect(page.locator('#lobby')).not.toBeVisible();
  await expect(page.locator('#app > header')).not.toBeVisible();
  await page.screenshot({ path: 'test-results/home.png' });
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/select\//);
  await expect(page.locator('#songs .song-card')).toHaveCount(3);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('7');
  await page.click('#lobby .share-link');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '/play/afterimage/7/mid/',
  );
  await page.goto('/play/afterimage/7/mid/');
  await expect(page.locator('#ready-title')).toHaveText('Afterimage');
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.active),
  ).toBe(false);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.audioActive),
  ).toBe(false);
  await page.reload();
  await expect(page.locator('#ready-screen')).toBeVisible();
  await page.screenshot({ path: 'test-results/ready.png' });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/select\//);
  await page.goBack();
  await expect(page.locator('#ready-screen')).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.active),
  ).toBe(false);
  const missing = await page.goto('/play/missing/5/low/');
  expect(missing?.status()).toBe(404);
});
