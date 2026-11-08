import { test, expect } from '@playwright/test';
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
])
  test(`actual initial result pixels and parity ${viewport.width}`, async ({
    browser,
  }) => {
    const c = await browser.newContext({
      viewport,
      isMobile: viewport.width < 500,
      hasTouch: viewport.width < 500,
      serviceWorkers: 'block',
      locale: 'ko-KR',
    });
    const p = await c.newPage();
    const fragment =
      'v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1';
    await p.goto('/result/#' + fragment);
    await expect(p.locator('#results')).toBeVisible();
    await p.waitForTimeout(1200);
    const live = await p.locator('#results').boundingBox();
    await p.screenshot({ path: `/downloads/orv62-live-${viewport.width}.png` });
    await c.route('**/_astro/*.js', async (r) => {
      await new Promise((x) => setTimeout(x, 2500));
      await r.continue();
    });
    await p.goto('/result/#' + fragment, { waitUntil: 'commit' });
    await expect(p.locator('#result-first-paint')).toBeVisible();
    const cached = await p.locator('#rpaint').boundingBox();
    await p.screenshot({
      path: `/downloads/orv62-initial-${viewport.width}.png`,
    });
    console.log('RESULT_GEOMETRY', { live, cached });
    await expect(p.locator('#result-entry')).toBeHidden();
    for (const k of ['x', 'y', 'width', 'height'] as const)
      expect(Math.abs(live![k] - cached![k])).toBeLessThan(3);
    await c.close();
  });
