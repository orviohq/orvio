import { test, expect } from '@playwright/test';
test('settings, real keyboard input, results and replay', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/select/');
  await expect(page.locator('.song-card')).toHaveCount(3);
  await page.click('[data-lanes="7"]');
  await page.click('#open-settings');
  await page.click('[data-slot="0"]');
  await page.keyboard.press('a');
  await expect(page.locator('[data-slot="0"]')).toContainText('A');
  await page.click('[data-pos="right"]');
  await page.locator('#settings .close').click();
  await page.reload();
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const notes = await page.evaluate(() =>
    (window as any).orvioDiagnostics.notes.map((s: any) => s.note),
  );
  let seq = 0;
  const keys = ['a', 's', 'd', 'f', 'g', 'h', 'j'];
  const events = notes
    .flatMap((n: any) => [
      { at: n.time, lane: n.lane, down: true },
      { at: n.end ?? n.time + 0.04, lane: n.lane, down: false },
    ])
    .sort((a: any, b: any) => a.at - b.at || Number(a.down) - Number(b.down));
  for (const e of events) {
    const time = await page.evaluate(
      () => (window as any).orvioDiagnostics.clock,
    );
    if (e.at > time) await page.waitForTimeout((e.at - time) * 1000);
    if (e.down) await page.keyboard.down(keys[e.lane]);
    else await page.keyboard.up(keys[e.lane]);
    seq++;
  }
  await expect(page.locator('#results')).toBeVisible({ timeout: 8000 });
  expect(await page.locator('#result-score').innerText()).not.toBe('0');
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/results.png' });
  await expect(page.locator('#results')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#lobby')).toBeVisible();
});
test('mobile layout is browse-only, no overflow', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/select/');
  await expect(page.locator('.mobile-note')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#start')).toHaveAttribute('title', /데스크톱/);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.active),
  ).toBeFalsy();
  await context.close();
});
