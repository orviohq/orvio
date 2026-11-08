import { test, expect } from '@playwright/test';
const result =
  '/result/#v=4&song=afterimage&keys=7&diff=high&score=500000&acc=50&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1&speed=3&shuffle=off&fade=off&seed=123';
test('count-up, punchy rank and sequential details animate without locking actions', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__scoreFrames = [];
    const tick = () => {
      const e = document.querySelector('#result-score');
      if (e && (document.querySelector('#results') as HTMLDialogElement)?.open)
        w.__scoreFrames.push({ t: performance.now(), text: e.textContent });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(result);
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#retry')).toBeEnabled();
  await expect(page.locator('#share-result')).toBeEnabled();
  const animations = await page.locator('#results').evaluate((e) =>
    e.getAnimations({ subtree: true }).map((a) => ({
      target:
        (a.effect as KeyframeEffect).target instanceof HTMLElement
          ? ((a.effect as KeyframeEffect).target as HTMLElement).id
          : '',
      delay: a.effect?.getTiming().delay,
      keyframes: (a.effect as KeyframeEffect).getKeyframes(),
    })),
  );
  expect(
    animations.some(
      (a) =>
        a.target === 'result-rank' &&
        a.keyframes.some((f) => String(f.transform).includes('2.4')),
    ),
  ).toBe(true);
  const delays = animations
    .filter((a) => !a.target)
    .map((a) => Number(a.delay));
  expect(new Set(delays).size).toBeGreaterThan(8);
  await expect(page.locator('#result-score')).toHaveText('500,000', {
    timeout: 3000,
  });
  const values: number[] = await page.evaluate(() =>
    (window as any).__scoreFrames.map((x: any) =>
      Number(x.text.replaceAll(',', '')),
    ),
  );
  expect(values.some((n) => n > 0 && n < 500000)).toBe(true);
  expect(values.every((n, i) => i === 0 || n >= values[i - 1])).toBe(true);
  await expect(page.locator('#result-score')).toHaveAttribute(
    'aria-label',
    '500,000',
  );
  await expect(page.locator('#result-rank')).toHaveText('C');
  await expect(page.locator('#result-rate')).toHaveText('50.00%');
  await page.screenshot({ path: '/downloads/orv59-final-desktop.png' });
});
test('reduced motion shows exact final values immediately, no animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(result);
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('500,000');
  expect(
    await page
      .locator('#results')
      .evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBe(0);
});
test('closing during reveal cancels it; next result owns its values and focus', async ({
  page,
}) => {
  await page.goto(result);
  await expect(page.locator('#results')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#results')).toBeHidden();
  await page.waitForTimeout(1200);
  await expect(page.locator('#result-score')).toHaveText('500,000');
  await page.goto(result.replace('afterimage', 'first-light'));
  await expect(page.locator('#result-song')).toHaveText('First Light');
  await expect(page.locator('#results')).toBeFocused();
  await expect(page.locator('#result-score')).toHaveText('500,000', {
    timeout: 3000,
  });
});
test('changing OS motion preference settles an in-flight count', async ({
  page,
}) => {
  await page.goto(result);
  await expect(page.locator('#results')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#result-score')).toHaveText('500,000');
  expect(
    await page
      .locator('#results')
      .evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBe(0);
});
test('motion evidence real frames desktop and mobile', async ({
  browser,
  baseURL,
}) => {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      locale: 'ko-KR',
      baseURL,
      recordVideo: { dir: '/downloads/orv59-motion', size: { width, height } },
    });
    const page = await context.newPage();
    await page.goto(result);
    await expect(page.locator('#results')).toBeVisible();
    await page.waitForTimeout(180);
    await page.screenshot({ path: `/downloads/orv59-early-${width}.png` });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `/downloads/orv59-mid-${width}.png` });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `/downloads/orv59-final-${width}.png` });
    await context.close();
    console.log('MOTION_VIDEO', width, await page.video()!.path());
  }
});
