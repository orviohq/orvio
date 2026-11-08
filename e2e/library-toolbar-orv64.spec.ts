import { test, expect } from '@playwright/test';
for (const locale of ['en-US', 'ko-KR'])
  for (const mobile of [false, true])
    test(`cached toolbar matches live and remains inert until ready ${mobile} ${locale}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        locale,
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
        isMobile: mobile,
        hasTouch: mobile,
        serviceWorkers: 'block',
      });
      const p = await context.newPage();
      await p.goto('/select/');
      await expect(p.locator('#add-youtube')).toBeVisible();
      await p.waitForFunction(
        () => !!localStorage.getItem('orvio.library-display.v1'),
      );
      const live = await p.locator('#add-youtube').boundingBox();
      const liveSVG = await p.locator('#add-youtube').innerHTML();
      const nav = await p.locator('#app header nav').innerText();
      await p.evaluate(() => {
        const cache = JSON.parse(
          localStorage.getItem('orvio.library-display.v1')!,
        );
        delete cache.fragments['.library .mobile-playback-note'];
        delete cache.addLabel;
        localStorage.setItem('orvio.library-display.v1', JSON.stringify(cache));
      });
      await p.route('**/_astro/*.js', async (r) => {
        await new Promise((x) => setTimeout(x, 2000));
        await r.continue();
      });
      await p.reload({ waitUntil: 'commit' });
      await expect(p.locator('#library-first-paint')).toBeVisible();
      await expect(p.locator('#cached-add-youtube')).toBeVisible();
      expect(await p.locator('#cached-add-youtube').innerHTML()).toBe(liveSVG);
      const cached = await p.locator('#cached-add-youtube').boundingBox();
      console.log('TOOLBAR_GEOMETRY', mobile, { live, cached });
      for (const k of ['x', 'y', 'width', 'height'] as const)
        expect(Math.abs(cached![k] - live![k])).toBeLessThan(2);
      expect(
        await p.locator('#library-first-paint header nav').innerText(),
      ).toBe(nav);
      await p.screenshot({
        path: `/downloads/orv64-after-cached-${mobile}.png`,
      });
      await p.keyboard.press('Tab');
      expect(
        await p
          .locator('#cached-add-youtube')
          .evaluate((n) => n === document.activeElement),
      ).toBe(false);
      await p.waitForFunction(
        () => !document.querySelector('#library-first-paint'),
      );
      await expect(p.locator('#add-youtube')).toBeVisible();
      await p.locator('#add-youtube').click();
      await expect(p.locator('#youtube-import')).toBeVisible();
      await p.locator('#youtube-cancel').click();
      await p.screenshot({ path: `/downloads/orv64-after-live-${mobile}.png` });
      await context.close();
    });
