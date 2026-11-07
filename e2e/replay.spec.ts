import { test, expect } from '@playwright/test';
test('real keyboard performance shares a local input replay with exact judgments and score', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const external: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') external.push(r.url());
  });
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const d = await page.evaluate(() => (window as any).orvioDiagnostics);
  const keys = ['d', 'f', 'Space', 'j', 'k'];
  for (const { note: n } of d.notes.slice(0, 7)) {
    await page.waitForFunction(
      (t) => (window as any).orvioAudioTime >= t,
      n.time,
      { polling: 1 },
    );
    await page.keyboard.down(keys[n.lane]);
    await page.waitForFunction(
      (t) => (window as any).orvioAudioTime >= t,
      n.end ?? n.time + 0.03,
      { polling: 1 },
    );
    await page.keyboard.up(keys[n.lane]);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(220);
  await page.keyboard.press('F3');
  await page.selectOption('#speed', '9');
  await page.selectOption('#fader', 'out2');
  await page.keyboard.press('Escape');
  await page.click('#resume');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  await expect(page.locator('#watch-replay')).toBeVisible();
  const original = await page.evaluate(() => ({
    score: (window as any).orvioDiagnostics.score,
    events: (window as any).orvioDiagnostics.events,
    resolved: (window as any).orvioDiagnostics.resolved,
  }));
  expect(original.score).toBeGreaterThan(0);
  expect(original.events.some((e: { value: number }) => e.value > 0)).toBe(
    true,
  );
  await expect(page.locator('#results')).toBeFocused();
  expect(
    await page.locator('#results').evaluate((e) => {
      const b = e.querySelector('#retry')!.getBoundingClientRect();
      const d = e.getBoundingClientRect();
      return b.bottom <= d.bottom - 16;
    }),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/actual-result-with-replay.png' });
  const url = page.url();
  expect(url).toContain('&r=');
  expect(url.length).toBeLessThan(120000);
  expect(external).toEqual([]);
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.locator('#watch-replay')).toBeVisible();
  await other.click('#watch-replay');
  await other.waitForFunction(
    () =>
      (window as any).orvioDiagnostics.replayActive &&
      (window as any).orvioDiagnostics.active,
  );
  await expect(other.locator('#play-options')).toBeDisabled();
  await expect(other.locator('#play-options')).toContainText('1.5');
  await other.waitForFunction(() => (window as any).orvioAudioTime > 0.5);
  await expect(other.locator('#game')).toBeVisible();
  await other.waitForTimeout(350);
  await other.screenshot({ path: 'test-results/actual-input-replay.png' });
  await expect(other.locator('#results')).toBeVisible({ timeout: 55000 });
  const replay = await other.evaluate(() => ({
    score: (window as any).orvioDiagnostics.score,
    events: (window as any).orvioDiagnostics.events,
    resolved: (window as any).orvioDiagnostics.resolved,
  }));
  expect(replay).toEqual(original);
  expect(new URL(other.url()).search).toBe('');
  await other.close();
});
