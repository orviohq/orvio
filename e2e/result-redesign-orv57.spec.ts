import { test, expect } from '@playwright/test';
import { LANGUAGES } from '../src/i18n';
const result =
  '/result/#v=4&song=afterimage&keys=7&diff=high&score=500000&acc=50&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1&speed=3&shuffle=off&fade=off&seed=123';
test('redesigned report keeps rank with score and translated actions on same row', async ({
  page,
}) => {
  await page.goto(result);
  await expect(page.locator('#results')).toBeVisible();
  // Final-layout bounds exclude the intentional rank stamp transform.
  await page.waitForFunction(
    () =>
      !document
        .querySelector('#results')!
        .hasAttribute('data-result-animating'),
  );
  // Presentation-only replay availability; actual replay is tested separately.
  await page
    .locator('#watch-replay')
    .evaluate((e) => e.classList.remove('hidden'));
  for (const [width, height] of [
    [979, 1173],
    [1173, 979],
    [1280, 800],
    [1280, 720],
    [768, 480],
    [390, 844],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => {
      const rect = (s: string) =>
        document.querySelector(s)!.getBoundingClientRect();
      const r = rect('#result-rank'),
        score = rect('.result-summary'),
        watch = rect('#watch-replay'),
        share = rect('#share-result');
      return {
        rankInside: r.top >= score.top && r.bottom <= score.bottom,
        toolsSameRow: Math.abs(watch.top - share.top) < 1,
        overlap: watch.right > share.left,
        overflow:
          document.querySelector('#results')!.scrollWidth >
          document.querySelector('#results')!.clientWidth,
      };
    });
    expect(layout).toEqual({
      rankInside: true,
      toolsSameRow: true,
      overlap: false,
      overflow: false,
    });
    await expect(page.locator('#share-result')).toContainText('결과 공유');
    await expect(page.locator('#watch-replay')).toContainText('리플레이');
    await page.screenshot({
      path: test.info().outputPath(`orv57-result-${width}x${height}.png`),
    });
  }
  for (const lang of Object.keys(LANGUAGES)) {
    await page.evaluate(
      (lang) =>
        localStorage.setItem(
          'orvio.settings.v1',
          JSON.stringify({ language: lang, languageMode: 'manual' }),
        ),
      lang,
    );
    await page.goto(result);
    await expect(page.locator('#results')).toBeVisible();
    await page
      .locator('#watch-replay')
      .evaluate((e) => e.classList.remove('hidden'));
    await expect(page.locator('#share-result [data-i18n]')).not.toBeEmpty();
    expect(
      await page
        .locator('#results')
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    const tops = await page
      .locator('#watch-replay,#share-result')
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().top));
    expect(Math.abs(tops[0] - tops[1])).toBeLessThan(1);
  }
});

test('natural completion and real shared replay retain labeled tools and responsive recovery', async ({
  page,
  browser,
}) => {
  let fragment = '';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) => {
    if (r.request().method() === 'POST')
      fragment = r.request().postDataJSON().fragment;
    return r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test_only_no_public_write_12345',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    });
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  await expect(page.locator('#watch-replay')).toBeVisible();
  await expect(page.locator('#share-result')).toContainText('결과 공유');
  await page.screenshot({
    path: test.info().outputPath('orv57-natural-desktop.png'),
  });
  expect(
    await page
      .locator('#results')
      .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
  ).toBe(true);
  await page.click('#share-result');
  await expect.poll(() => fragment.length).toBeGreaterThan(100);
  await page.click('#watch-replay');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('body')).toHaveClass(/replay-view/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#results')).toBeVisible();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
    baseURL: new URL(page.url()).origin,
  });
  const p = await mobile.newPage();
  await p.goto('/result/#' + fragment);
  await expect(p.locator('#results')).toBeVisible();
  await expect(p.locator('#watch-replay')).toBeVisible();
  await expect(p.locator('#retry')).toBeHidden();
  await p.screenshot({
    path: test.info().outputPath('orv57-natural-mobile.png'),
  });
  const rows = await p
    .locator('#watch-replay,#share-result')
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().top));
  expect(Math.abs(rows[0] - rows[1])).toBeLessThan(1);
  await p.click('#watch-replay');
  await p.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(p.locator('#replay-playing')).toBeVisible();
  await mobile.close();
  expect(errors).toEqual([]);
});
