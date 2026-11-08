import { mockShare } from './share-mock';
import { test, expect } from '@playwright/test';
test('finished and reopened result are the same view, copy works without a link field', async ({
  page,
  context,
}) => {
  test.setTimeout(85000);
  const shared = await mockShare(context);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  await expect(page.locator('#result-fever')).toContainText('FEVER MAX 0');
  const url = page.url();
  expect(url).toContain('/result/#v=4&');
  await expect(page.locator('#result-url,#share-privacy')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const original = await page.locator('#results').screenshot();
  await page.click('#share-result');
  await expect(page.locator('#toast')).toHaveText('링크를 복사했어요');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '/result/?s=',
  );
  await expect(page.locator('#results #toast')).toBeVisible();
  await expect(page.locator('#toast')).toHaveText('링크를 복사했어요');
  await page.waitForFunction(
    () => !document.querySelector('#toast')?.classList.contains('visible'),
  );
  await page.reload();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-fever')).toContainText('FEVER MAX 0');
  await page.evaluate(() => document.fonts.ready);
  const reopened = await page.locator('#results').screenshot();
  // CI trace showed exactly one blue-channel antialiasing pixel (delta 4)
  // at the edge of the same text. Keep dimensions, content and all other pixels
  // strict; never allow moved labels, missing counts, focus or layout changes.
  const comparison = await page.evaluate(
    async (images) => {
      const frames = await Promise.all(
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
            pixels: ctx.getImageData(0, 0, c.width, c.height).data,
          };
        }),
      );
      const [a, b] = frames;
      let changed = 0,
        maxChannel = 0;
      if (a.width !== b.width || a.height !== b.height)
        return { sameSize: false, changed: Infinity, maxChannel: Infinity };
      for (let i = 0; i < a.pixels.length; i += 4) {
        let diff = false;
        for (let c = 0; c < 4; c++) {
          const d = Math.abs(a.pixels[i + c] - b.pixels[i + c]);
          if (d) diff = true;
          maxChannel = Math.max(maxChannel, d);
        }
        if (diff) changed++;
      }
      return { sameSize: true, changed, maxChannel };
    },
    [original.toString('base64'), reopened.toString('base64')],
  );
  expect(comparison.sameSize).toBe(true);
  expect(comparison.changed).toBeLessThanOrEqual(1);
  expect(comparison.maxChannel).toBeLessThanOrEqual(4);
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
