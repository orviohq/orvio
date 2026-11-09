import { test, expect } from '@playwright/test';
const fragment =
  'v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1';
test('cold short entry paints only a result shell and then the result, never home', async ({
  browser,
  baseURL,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  let release!: () => void;
  const hold = new Promise<void>((r) => (release = r));
  await context.route(
    'https://orvio-share.pn-26f.workers.dev/**',
    async (route) => {
      await hold;
      await route.fulfill({
        json: {
          fragment,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    },
  );
  await page.addInitScript(() => {
    (window as any).entryFrames = [];
    const inspect = () => {
      const home = document.querySelector('#home-screen');
      const result = document.querySelector('#results');
      (window as any).entryFrames.push({
        pending: document.documentElement.hasAttribute('data-result-pending'),
        homeVisible:
          !!home &&
          getComputedStyle(home).visibility !== 'hidden' &&
          getComputedStyle(home).display !== 'none',
        result: result?.hasAttribute('open'),
      });
    };
    new MutationObserver(inspect).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  });
  await page.goto(baseURL + '/result/?s=synthetic000000000000000000');
  await expect(page.locator('#result-entry')).toBeVisible();
  await expect(page.locator('#home-start')).toBeHidden();
  await expect(page.locator('#result-entry')).toHaveText('');
  expect(
    await page
      .locator('.result-spinner')
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('result-spin');
  await page.screenshot({
    path: testInfo.outputPath('a37-result-spinner.png'),
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.result-spinner')
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  await page.screenshot({
    path: testInfo.outputPath('a37-result-reduced-motion.png'),
  });
  release();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-entry')).toBeHidden();
  await expect(page.locator('#result-score')).toHaveText('500,000');
  expect(
    await page.evaluate(() =>
      (window as any).entryFrames.some((f: any) => f.homeVisible),
    ),
  ).toBe(false);
  await page.screenshot({ path: 'test-results/orvio-share-entry-result.png' });
  await context.close();
});
test('result Open Graph is in initial HTML, not a client-only rewrite', async ({
  request,
}) => {
  const response = await request.get('/result/?s=synthetic000000000000000000');
  const text = await response.text();
  expect(text).toContain('Orvio result · score &amp; replay');
  expect(text).toContain('https://orvio-play.pages.dev/og-result.png');
  expect(text).toContain('View the score, accuracy and combo.');
  expect(text).toContain('data-result-pending');
});
