import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('touch replay fills formerly empty footer area and suppresses doubletap default without blocking edits', async ({
  browser,
}) => {
  const fragment = JSON.parse(
    fs.readFileSync('e2e/fixtures/v027-public-proof.json', 'utf8'),
  )[0].shareCaptures[0].fragment;
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await c.newPage();
  await p.goto('/result/#' + fragment);
  await p.locator('#watch-replay').click();
  await p.waitForFunction(() => (window as any).orvioDiagnostics.audioActive);
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 390, height: 700 },
  ]) {
    await p.setViewportSize(size);
    await expect
      .poll(() =>
        p
          .locator('#arena')
          .evaluate((e) => Math.round(e.getBoundingClientRect().bottom)),
      )
      .toBe(size.height);
    expect(
      await p
        .locator('.game-footer')
        .evaluate((e) => e.getBoundingClientRect().height),
    ).toBe(0);
    const before = await p.evaluate(() => visualViewport!.scale);
    await p.touchscreen.tap(190, 300);
    await p.touchscreen.tap(190, 300);
    expect(await p.evaluate(() => visualViewport!.scale)).toBe(before);
    expect(
      await p
        .locator('#highway')
        .evaluate((e) => getComputedStyle(e).touchAction),
    ).toBe('manipulation');
    expect(
      await p
        .locator('#highway')
        .evaluate((e) =>
          e.dispatchEvent(
            new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
          ),
        ),
    ).toBe(false);
    await p.screenshot({
      path: test
        .info()
        .outputPath('touch-' + size.width + '-' + size.height + '.png'),
    });
  }
  await p.setViewportSize({ width: 844, height: 390 });
  await p.addStyleTag({
    content:
      ':root {--play-safe-top: 12px;--play-safe-left:47px;--play-safe-right:47px;--play-safe-bottom:21px}',
  });
  await expect
    .poll(() =>
      p
        .locator('#arena')
        .evaluate((e) => Math.round(e.getBoundingClientRect().bottom)),
    )
    .toBe(369);
  const safe = await p
    .locator('#exit')
    .evaluate((e) => e.getBoundingClientRect().toJSON());
  expect(safe.left).toBeGreaterThanOrEqual(47);
  expect(safe.top).toBeGreaterThanOrEqual(12);
  await p.screenshot({
    path: test.info().outputPath('modeled-notch-landscape.png'),
  });
  expect(
    await p.locator('meta[name=viewport]').getAttribute('content'),
  ).toContain('viewport-fit=cover');
  await p.locator('#exit').click();
  await p.goto('/select/');
  await p.locator('#add-youtube').click();
  expect(
    await p
      .locator('#youtube-url')
      .evaluate((e) =>
        e.dispatchEvent(
          new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
        ),
      ),
  ).toBe(true);
  await p.locator('#youtube-url').fill('https://youtu.be/WGm2HmXeeRI');
  await expect(p.locator('#youtube-url')).toHaveValue(
    'https://youtu.be/WGm2HmXeeRI',
  );
  await p.keyboard.press('Escape');
  await p.setViewportSize({ width: 390, height: 844 });
  const cdp = await c.newCDPSession(p);
  const baseline = await p.evaluate(() => visualViewport!.scale);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 160, y: 350, id: 1 },
      { x: 220, y: 350, id: 2 },
    ],
  });
  for (let d = 35; d <= 100; d += 5) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: 190 - d, y: 350, id: 1 },
        { x: 190 + d, y: 350, id: 2 },
      ],
    });
    await p.waitForTimeout(25);
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect
    .poll(() => p.evaluate(() => visualViewport!.scale))
    .toBeGreaterThan(baseline);
  console.log(
    'MULTITOUCH_SCALE',
    await p.evaluate(() => visualViewport!.scale),
  );
  await c.close();
});
