import { test, expect } from '@playwright/test';
test('combined artwork stays fixed for short long and unbroken titles across desktop and mobile', async ({
  page,
}, info) => {
  for (const [w, h] of [
    [1280, 720],
    [390, 844],
    [320, 568],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/select/');
    const b = await page.locator('#selected-art').boundingBox();
    for (const title of ['Short', 'Long title '.repeat(30), 'W'.repeat(250)]) {
      await page.evaluate(async (title) => {
        const { SONGS } = await import(
          /*@vite-ignore*/ String('/src/chart.ts')
        );
        SONGS[1].title = title;
      }, title);
      await page.locator('[data-song="1"]').evaluate((e) => e.click());
      expect(await page.locator('#selected-art').boundingBox()).toEqual(b);
      await page.locator('[data-song="0"]').evaluate((e) => e.click());
    }
    console.log('FIXED_ART', w, b);
    await page.screenshot({ path: info.outputPath(`layout-${w}.png`) });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
