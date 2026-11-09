import { test, expect } from '@playwright/test';
// Regression: syncSettings must not overwrite the mobile/preparing guard
// merely because the selected chart exists. Playback remains desktop-only.
test('touch selection stays disabled across chart and options refresh, not merely blocked at click time', async ({
  browser,
  baseURL,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
  });
  try {
    const page = await context.newPage();
    await page.goto(baseURL + '/select/');
    await expect(page.locator('#start')).toBeDisabled();
    for (const choice of ['mid', 'high', 'low']) {
      await page.locator(`[data-diff="${choice}"]`).click();
      await expect(page.locator('#start')).toBeDisabled();
    }
    await page.locator('[data-lanes="7"]').click();
    await expect(page.locator('#start')).toBeDisabled();
    await page.locator('[data-lanes="5"]').click();
    await expect(page.locator('#start')).toBeDisabled();
    await page.locator('#open-game-options').click();
    await page.getByRole('radio', { name: '2.0×', exact: true }).click();
    await page.locator('#options-done').click();
    await expect(page.locator('#start')).toBeDisabled();
    await page.keyboard.press('Enter');
    expect(
      await page.evaluate(() =>
        Boolean((window as any).orvioDiagnostics?.active),
      ),
    ).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath('mobile-start-guard.png'),
    });
  } finally {
    await context.close();
  }
});
