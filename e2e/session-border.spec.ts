import { test, expect } from '@playwright/test';
test('red miss feedback resets for next song, actual end retry and replay start', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#highway-wrap')).toHaveClass(/danger/, {
    timeout: 12000,
  });
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#highway-wrap')).not.toHaveClass(/danger/);
  await page.screenshot({ path: '/downloads/coherent-a17-next-start.png' });
  // Let a real complete song resolve naturally. Last misses legitimately set danger.
  await expect(page.locator('#results')).toBeVisible({ timeout: 55000 });
  await expect(page.locator('#highway-wrap')).toHaveClass(/danger/);
  await page.click('#retry');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#highway-wrap')).not.toHaveClass(/danger/);
  await page.screenshot({ path: '/downloads/coherent-a17-result-retry.png' });
  await expect(page.locator('#highway-wrap')).toHaveClass(/danger/, {
    timeout: 12000,
  });
  await expect(page.locator('#results')).toBeVisible({ timeout: 55000 });
  await page.click('#watch-replay');
  await page.waitForFunction(
    () =>
      (window as any).orvioDiagnostics.active &&
      (window as any).orvioDiagnostics.replayActive,
  );
  await expect(page.locator('#highway-wrap')).not.toHaveClass(/danger/);
  await page.screenshot({ path: '/downloads/coherent-a17-replay-start.png' });
});
test('English start-game wording is visible and accessible on home and selection', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'orvio.settings.v1',
      JSON.stringify({ language: 'en', languageMode: 'manual' }),
    ),
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'START GAME ENTER ↵', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '/downloads/coherent-a19-home.png' });
  await page.click('#home-start');
  await expect(page.locator('#start')).toContainText('START GAME');
  expect(await page.locator('body').innerText()).not.toContain('START SESSION');
});
