import { test, expect } from '@playwright/test';
test('finished and reopened result are the same view, copy works without a link field', async ({
  page,
  context,
}) => {
  test.setTimeout(85000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  const url = page.url();
  expect(url).toContain('/result/#v=4&');
  await expect(page.locator('#result-url,#share-privacy')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
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
  await page.evaluate(() => document.fonts.ready);
  const reopened = await page.locator('#results').screenshot();
  const decoded = await page.evaluate(
    async (images) =>
      Promise.all(
        images.map(async (base) => {
          const blob = await (
            await fetch('data:image/png;base64,' + base)
          ).blob();
          const image = await createImageBitmap(blob);
          const c = document.createElement('canvas');
          c.width = image.width;
          c.height = image.height;
          const ctx = c.getContext('2d')!;
          ctx.drawImage(image, 0, 0);
          return {
            width: c.width,
            height: c.height,
            rgba: Array.from(
              new Uint8Array(
                await crypto.subtle.digest(
                  'SHA-256',
                  ctx.getImageData(0, 0, c.width, c.height).data,
                ),
              ),
            )
              .map((v) => v.toString(16).padStart(2, '0'))
              .join(''),
          };
        }),
      ),
    [original.toString('base64'), reopened.toString('base64')],
  );
  expect(decoded[1]).toEqual(decoded[0]);
  await page.screenshot({ path: 'test-results/result-direct.png' });
  await page.click('#retry');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#game')).toBeVisible();
  expect(await page.locator('body').getAttribute('class')).not.toMatch(
    /home-screen|ready-screen/,
  );
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await page.goto(url);
  await expect(page.locator('#results')).toBeVisible();
  await page.click('#back');
  await expect(page).toHaveURL(/\/select\//);
});
