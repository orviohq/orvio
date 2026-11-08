import { test, expect } from '@playwright/test';
test('short Escape returns to song selection without application fullscreen exit', async ({
  page,
}) => {
  await page.goto('/');
  await page.click('#home-start');
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).orvioDiagnostics.fullscreenEscape),
    )
    .not.toBe('pending');
  console.log(
    'Keyboard capture:',
    await page.evaluate(
      () => (window as any).orvioDiagnostics.fullscreenEscape,
    ),
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.click('#pause-exit');
  await expect(page).toHaveURL(/select/);
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
});

test('actual fullscreen result Escape selects the track without leaving fullscreen', async ({
  page,
}) => {
  test.setTimeout(65000);
  await page.goto('/');
  await page.click('#home-start');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/select/);
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
});

test('denied keyboard capture does not block starting or misreport a lock', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'keyboard', {
      value: { lock: () => Promise.reject(new Error('denied')), unlock() {} },
      configurable: true,
    }),
  );
  await page.goto('/');
  await page.click('#home-start');
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).orvioDiagnostics.fullscreenEscape),
    )
    .toBe('denied');
  await expect(page.locator('[data-sonner-toast]')).toContainText(
    'ESC 전체화면',
  );
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect(
    await page.evaluate(
      () => (window as any).orvioDiagnostics.fullscreenEscape,
    ),
  ).not.toBe('locked');
});
