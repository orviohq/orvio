import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test('library rerender after replay never gives game clicks a library row handler', async ({
  browser,
  baseURL,
}, testInfo) => {
  const fragment = JSON.parse(
    fs.readFileSync('e2e/fixtures/v027-public-proof.json', 'utf8'),
  )[0].shareCaptures[0].fragment;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.stack ?? String(e)));
  await page.goto(baseURL + '/result/#' + fragment);
  await page.click('#watch-replay');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.replayActive),
  );
  await page.waitForFunction(() => (window as any).orvioAudioTime > 0.5);
  await page.click('#exit');
  await expect(page.locator('#results')).toBeVisible();
  await page.click('#back');
  await expect(page.locator('#lobby')).toBeVisible();
  // Normal return-to-library rerenders rows while #game retains its source ID.
  expect(
    await page.locator('#game').evaluate((e) => e.getAttribute('data-song')),
  ).toBe('first-light');
  expect(
    await page
      .locator('#game')
      .evaluate((e) => (e as HTMLElement).onclick === null),
  ).toBe(true);
  await page.goBack();
  await expect(page.locator('#results')).toBeVisible();
  await page.click('#watch-replay');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.replayActive),
  );
  await page.waitForFunction(() => (window as any).orvioAudioTime > 0.5);
  await page.click('#exit');
  await expect(page.locator('#results')).toBeVisible();
  expect(errors).toEqual([]);
  await page.waitForFunction(() => {
    const e = document.querySelector<HTMLElement>('#results')!;
    return (
      !e.dataset.resultAnimating &&
      !e
        .getAnimations({ subtree: true })
        .some((a) => a.pending || a.playState === 'running')
    );
  });
  await page.screenshot({
    path: testInfo.outputPath('late-library-rerender-replay-exit.png'),
  });
  await context.close();
});
