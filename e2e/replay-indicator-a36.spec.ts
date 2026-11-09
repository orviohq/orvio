import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test('new A36 replay indicator is visible only for actual watching on desktop and mobile, ends on exit/completion', async ({
  page,
}) => {
  test.setTimeout(85000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const fragment = JSON.parse(
    fs.readFileSync('e2e/fixtures/v027-public-proof.json', 'utf8'),
  )[0].shareCaptures[0].fragment;
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  await expect(page.locator('#replay-playing')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await expect(page.locator('#replay-playing')).toBeHidden();
  await page.click('#pause-exit');
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/result/#' + fragment);
    await page.click('#watch-replay');
    await page.waitForFunction(() =>
      Boolean(
        (window as any).orvioDiagnostics?.replayActive &&
        (window as any).orvioDiagnostics?.active,
      ),
    );
    await page.waitForFunction(() => (window as any).orvioAudioTime > 1);
    await expect(page.locator('#replay-playing')).toContainText(
      '리플레이 재생 중',
    );
    await expect(page.locator('#replay-playing')).toBeInViewport();
    await expect(page.locator('#now-title')).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`a36-replay-indicator-${width}.png`),
    });
    if (width === 1280) {
      await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
    } else {
      await page.keyboard.press('Escape');
      await expect(page.locator('#results')).toBeVisible();
    }
    await expect(page.locator('#replay-playing')).toBeHidden();
    expect(await page.locator('#pause').isVisible()).toBe(false);
  }
  expect(errors).toEqual([]);
});
