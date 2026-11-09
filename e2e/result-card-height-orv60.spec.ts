import { test, expect } from '@playwright/test';
const result =
  '/result/#v=4&song=afterimage&keys=7&diff=high&score=885025&acc=88.5&combo=180&j=705,70,58,35,17,12,12,1,1,4,33,25&speed=7&shuffle=off&fade=off&seed=123';
for (const viewport of [
  { width: 979, height: 1173 },
  { width: 1173, height: 979 },
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
])
  test(`result card ends just below actions at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto(result);
    await expect(page.locator('#results')).toBeVisible();
    await page
      .locator('#watch-replay')
      .evaluate((e) => e.classList.remove('hidden'));
    const measure = await page.locator('#results').evaluate((e) => {
      e.scrollTop = e.scrollHeight;
      const r = e.getBoundingClientRect(),
        a = e.querySelector('.result-actions')!.getBoundingClientRect();
      return {
        blank: r.bottom - a.bottom,
        bottom: r.bottom,
        overflow: e.scrollWidth > e.clientWidth,
      };
    });
    expect(measure.blank).toBeGreaterThanOrEqual(18);
    expect(measure.blank).toBeLessThan(35);
    expect(measure.bottom).toBeLessThanOrEqual(viewport.height);
    expect(measure.overflow).toBe(false);
    await expect(page.locator('#retry')).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath(`orv60-final-${viewport.width}.png`),
    });
  });
