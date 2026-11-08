import { test, expect } from '@playwright/test';
test('actual local replay retry preserves decoded wallpaper presentation before a fresh clock', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  const path = new URL(page.url()).pathname + new URL(page.url()).search;
  expect(path).toContain('/result/?local=');
  await page.goto(path);
  await expect(page.locator('#results')).toBeVisible();
  for (let run = 0; run < 2; run++) {
    const at = await page.evaluate(() => performance.now());
    await page.click('#retry');
    await expect(page.locator('#song-loading')).toBeVisible();
    await expect(page.locator('#loading-wallpaper')).toBeVisible();
    await page.waitForTimeout(600);
    expect(
      await page.evaluate(() => (window as any).orvioDiagnostics?.active),
    ).toBe(false);
    await page.screenshot({ path: `/downloads/orv63-wallpaper-${run}.png` });
    await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
    const elapsed = (await page.evaluate(() => performance.now())) - at;
    console.log('LOCAL_RETRY_WALLPAPER_MS', run, elapsed);
    expect(elapsed).toBeGreaterThanOrEqual(1180);
    expect(elapsed).toBeLessThan(5000);
    await page.keyboard.press('Escape');
    await page.click('#pause-exit');
    await page.goto(path);
    await expect(page.locator('#results')).toBeVisible();
  }
});
