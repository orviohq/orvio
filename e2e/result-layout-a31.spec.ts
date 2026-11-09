import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test('A31 result panel title and actions fully reachable with honest internal scrolling', async ({
  page,
}) => {
  const fragment = JSON.parse(
    fs.readFileSync('e2e/fixtures/v027-public-proof.json', 'utf8'),
  )[0].shareCaptures[0].fragment;
  for (const [width, height] of [
    [1280, 720],
    [1280, 480],
    [390, 844],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/result/#' + fragment);
    await expect(page.locator('#results')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const rects = await page.locator('#results').evaluate((el) => ({
      h: el.clientHeight,
      sh: el.scrollHeight,
      top: el.scrollTop,
      rect: el.getBoundingClientRect().toJSON(),
      children: [...el.children].map((c) => ({
        id: c.id,
        cls: c.className,
        h: c.getBoundingClientRect().height,
        y: c.getBoundingClientRect().y,
        mt: getComputedStyle(c).marginTop,
        mb: getComputedStyle(c).marginBottom,
      })),
    }));
    if (width === 1280 && height === 720)
      expect(rects.sh).toBeLessThanOrEqual(rects.h + 1);
    console.log('RESULT_RECTS', width, height, JSON.stringify(rects));
    await page.locator('#results').evaluate((el) => (el.scrollTop = 0));
    await expect(page.locator('#result-song')).toBeInViewport();
    await page.screenshot({
      path: test.info().outputPath(`a31-result-top-${width}-${height}.png`),
    });
    await page.locator('#retry').scrollIntoViewIfNeeded();
    await expect(page.locator('#retry')).toBeInViewport();
    await page.screenshot({
      path: test.info().outputPath(`a31-result-bottom-${width}-${height}.png`),
    });
  }
});
