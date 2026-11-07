import { test, expect } from '@playwright/test';
test('all song transitions never paint a stale loading wallpaper', async ({
  page,
}) => {
  test.setTimeout(80000);
  await page.goto('/select/');
  const songs = ['first-light', 'afterimage', 'violet-drive'];
  for (const from of songs)
    for (const to of songs) {
      if (from === to) continue;
      await page.goto('/play/' + from + '/5/low/');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
      await page.keyboard.press('Escape');
      await page.click('#pause-exit');
      await page
        .locator(`.song-card[data-song="${songs.indexOf(to)}"]`)
        .click();
      await page.evaluate((song) => {
        const w = window as any;
        w.loadingChecks = [];
        const image =
          document.querySelector<HTMLImageElement>('#loading-wallpaper')!;
        const overlay = document.querySelector('#song-loading')!;
        const inspect = () => {
          if (!overlay.classList.contains('hidden') && !image.hidden)
            w.loadingChecks.push({
              src: image.getAttribute('src'),
              complete: image.complete && image.naturalWidth > 0,
            });
        };
        const observer = new MutationObserver(inspect);
        observer.observe(image, { attributes: true });
        const nativeDecode = image.decode.bind(image);
        image.decode = async () => {
          w.loadingHiddenAtDecode = image.hidden;
          await nativeDecode();
          w.loadingDecodedSource = image.currentSrc;
        };
        w.expectedLoading = song;
        w.loadingObserver = observer;
      }, to);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
      await expect(page.locator('#loading-wallpaper')).toHaveAttribute(
        'src',
        '/wallpapers/' + to + '.png',
      );
      const checks = await page.evaluate(() => {
        const w = window as any;
        w.loadingObserver.disconnect();
        return {
          hidden: w.loadingHiddenAtDecode,
          decoded: w.loadingDecodedSource,
          frames: w.loadingChecks,
        };
      });
      expect(checks.hidden).toBe(true);
      expect(new URL(checks.decoded).pathname).toBe(
        '/wallpapers/' + to + '.png',
      );
      expect(checks.frames.length).toBeGreaterThan(0);
      expect(
        checks.frames.every(
          (f: { src: string; complete: boolean }) =>
            f.src === '/wallpapers/' + to + '.png' && f.complete,
        ),
      ).toBe(true);
      await expect(page.locator('#song-loading')).toBeHidden();
      await page.keyboard.press('Escape');
      await page.click('#pause-exit');
    }
});
