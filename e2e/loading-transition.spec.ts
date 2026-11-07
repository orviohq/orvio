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
      await page.keyboard.press('Enter');
      await expect(page.locator('#song-loading')).toBeVisible();
      await expect(page.locator('#loading-wallpaper')).toHaveAttribute(
        'src',
        '/wallpapers/' + to + '.png',
      );
      await expect(page.locator('#loading-wallpaper')).toBeVisible();
      expect(
        await page
          .locator('#loading-wallpaper')
          .evaluate((e) => (e as HTMLImageElement).complete),
      ).toBe(true);
      await page.screenshot({ path: `test-results/loading-${from}-${to}.png` });
      await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
      await page.keyboard.press('Escape');
      await page.click('#pause-exit');
    }
});
