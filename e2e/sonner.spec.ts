import { sonnerResultFixture } from './sonner-fixture';
import { test, expect } from '@playwright/test';
import { mockShare } from './share-mock';

test('actual Sonner preserves latest text, safe literal text, lifetime and modal visibility', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/select/');
  const notify = (message: string) =>
    page.evaluate(async (text) => {
      const { showToast } = await import(
        /* @vite-ignore */ String('/src/ui/sonner.ts')
      );
      showToast(text);
    }, message);
  await notify('첫 번째 알림');
  const toast = page.locator('[data-sonner-toast][data-visible="true"]');
  await expect(toast).toContainText('첫 번째 알림');
  await page.waitForTimeout(2000);
  await notify('<img src=x onerror=alert(1)> 두 번째 오류');
  await expect(toast).toContainText(
    '<img src=x onerror=alert(1)> 두 번째 오류',
  );
  expect(await toast.locator('img').count()).toBe(0);
  await page.waitForTimeout(1400);
  await expect(toast).toBeVisible();
  await expect(page.locator('#toast-root section')).toHaveAttribute(
    'aria-live',
    'polite',
  );
  await page.waitForTimeout(500);
  console.log(
    'TOAST',
    await toast.evaluate((e) => ({
      rect: e.getBoundingClientRect().toJSON(),
      css: getComputedStyle(e).cssText,
      transform: getComputedStyle(e).transform,
      parent: e.parentElement?.outerHTML.slice(0, 1500),
    })),
  );
  await page.screenshot({ path: '/downloads/a53-selection-sonner.png' });
  await expect(toast).toHaveCount(0, { timeout: 5000 });

  await page.locator('#open-settings').click();
  await notify('설정 변경 오류 - 키가 이미 사용 중입니다.');
  await expect(toast).toContainText('설정 변경 오류');
  await expect(page.locator('#settings #toast-root')).toHaveCount(1);
  const rects = await page.evaluate(() => ({
    t: document
      .querySelector('[data-sonner-toast]')!
      .getBoundingClientRect()
      .toJSON(),
    d: document.querySelector('#settings')!.getBoundingClientRect().toJSON(),
    popover: document.querySelector('#toast-root')!.matches(':popover-open'),
  }));
  expect(rects.popover).toBe(true);
  expect(rects.t.bottom).toBeLessThanOrEqual(rects.d.top);
  await page.waitForTimeout(500);
  console.log(
    'TOAST',
    await toast.evaluate((e) => ({
      rect: e.getBoundingClientRect().toJSON(),
      css: getComputedStyle(e).cssText,
      transform: getComputedStyle(e).transform,
      parent: e.parentElement?.outerHTML.slice(0, 1500),
    })),
  );
  await page.screenshot({ path: '/downloads/a53-settings-sonner.png' });
  await page.locator('#settings .close').click();
  await expect(page.locator('body > #toast-root')).toHaveCount(1);
  await expect(toast).toBeVisible();
  expect(errors).toEqual([]);
});

test('all languages and mobile long feedback fit, modal close does not strand feedback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/select/');
  await page.locator('#open-settings').click();
  await page.evaluate(async () => {
    const { showToast } = await import(
      /* @vite-ignore */ String('/src/ui/sonner.ts')
    );
    showToast(
      '파일을 저장하지 못했습니다. 브라우저 저장 공간 또는 권한을 확인해 주세요. '.repeat(
        2,
      ),
    );
  });
  const toast = page.locator('[data-sonner-toast][data-visible="true"]');
  await expect(toast).toBeVisible();
  const rects = await page.evaluate(() => ({
    t: document
      .querySelector('[data-sonner-toast]')!
      .getBoundingClientRect()
      .toJSON(),
    d: document.querySelector('#settings')!.getBoundingClientRect().toJSON(),
  }));
  expect(rects.t.x).toBeGreaterThanOrEqual(0);
  expect(rects.t.right).toBeLessThanOrEqual(320);
  expect(rects.t.bottom).toBeLessThanOrEqual(rects.d.top);
  await page.waitForTimeout(500);
  console.log(
    'TOAST',
    await toast.evaluate((e) => ({
      rect: e.getBoundingClientRect().toJSON(),
      css: getComputedStyle(e).cssText,
      transform: getComputedStyle(e).transform,
      parent: e.parentElement?.outerHTML.slice(0, 1500),
    })),
  );
  await page.screenshot({ path: '/downloads/a53-mobile-sonner.png' });
});

test('real playback notifications avoid all three highway positions and score HUD', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/select/');
  for (const position of ['left', 'center', 'right']) {
    await page.locator('#open-settings').click();
    await page.locator(`[data-pos="${position}"]`).click();
    await page.locator('#settings .close').click();
    await page.locator('#start').click();
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    await page.evaluate(async () => {
      const { showToast } = await import(
        /* @vite-ignore */ String('/src/ui/sonner.ts')
      );
      showToast('알림: 재생이 진행 중입니다.');
    });
    await page.waitForTimeout(500);
    const rects = await page.evaluate(() => {
      const box = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect().toJSON();
      return {
        toast: box('[data-sonner-toast]'),
        highway: box('#highway-wrap'),
        score: box('.score-block'),
      };
    });
    const overlaps = (a: any, b: any) =>
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top;
    expect(overlaps(rects.toast, rects.highway)).toBe(false);
    expect(overlaps(rects.toast, rects.score)).toBe(false);
    console.log('PLAYBACK', position, rects);
    await page.screenshot({
      path: `/downloads/a53-game-${position}-sonner.png`,
    });
    await page.keyboard.press('Escape');
    await page.locator('#pause-exit').click();
  }
});

test('real shared result copy feedback does not cover result title, stats or actions', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockShare(context);
  const fragment = await sonnerResultFixture(page);
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/result/#' + fragment);
    await expect(page.locator('#results')).toBeVisible();
    await page.locator('#share-result').click();
    await expect(page.locator('[data-sonner-toast]')).toContainText(
      '링크를 복사했어요',
    );
    await page.waitForTimeout(500);
    const rects = await page.evaluate(() => {
      const box = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect().toJSON();
      return { toast: box('[data-sonner-toast]'), result: box('#results') };
    });
    console.log('RESULT', width, height, rects);
    expect(rects.toast.top).toBeGreaterThanOrEqual(0);
    expect(
      rects.toast.right <= rects.result.left ||
        rects.toast.left >= rects.result.right ||
        rects.toast.bottom <= rects.result.top,
    ).toBe(true);
    expect(rects.toast.right).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `/downloads/a53-result-${width}x${height}-sonner.png`,
    });
    await page.locator('#back').scrollIntoViewIfNeeded();
    await expect(page.locator('#back')).toBeInViewport();
  }
});

test('nested modal follows focused topmost dialog rather than DOM order', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.evaluate(async () => {
    const { showToast } = await import(
      /* @vite-ignore */ String('/src/ui/sonner.ts')
    );
    (document.querySelector('#results') as HTMLDialogElement).showModal();
    (document.querySelector('#settings') as HTMLDialogElement).showModal();
    showToast('가장 위 대화상자 알림');
  });
  await expect(page.locator('#settings #toast-root')).toHaveCount(1);
  await page.waitForTimeout(500);
  await expect(page.locator('[data-sonner-toast]')).toBeInViewport();
  await page.evaluate(() =>
    (document.querySelector('#settings') as HTMLDialogElement).close(),
  );
  await expect(page.locator('#results #toast-root')).toHaveCount(1);
});
