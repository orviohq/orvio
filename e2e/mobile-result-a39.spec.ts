import fs from 'node:fs';
import { externalResultFixtureFragment } from './external-result-fixture';
import { test, expect } from '@playwright/test';
test('A39 mobile compact result and actual replay, no direct gameplay on any entry', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90000);
  const fragment = JSON.parse(
    fs.readFileSync('e2e/fixtures/v027-public-proof.json', 'utf8'),
  )[0].shareCaptures[0].fragment;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
  });
  const p = await context.newPage();
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await p.setViewportSize({ width, height });
    await p.goto(baseURL + '/result/#' + fragment);
    await expect(p.locator('#results')).toBeVisible();
    await p.waitForFunction(
      () => {
        const e = document.querySelector('#results')!;
        return (
          !(e as HTMLElement).dataset.resultAnimating &&
          !e
            .getAnimations({ subtree: true })
            .some((a) => a.pending || a.playState === 'running')
        );
      },
      undefined,
      { timeout: 4000 },
    );
    const r = await p
      .locator('#results')
      .evaluate((e) => e.getBoundingClientRect().toJSON());
    // ORV-57 redesign and ORV-60 excess-gap correction supersede the old
    // viewport-filling panel. Preserve the compact 12px-inset card contract.
    expect(r.x).toBe(12);
    expect(r.y).toBeGreaterThanOrEqual(12);
    expect(r.width).toBe(width - 24);
    expect(r.height).toBeLessThanOrEqual(height - 24);
    expect(r.y + r.height).toBeLessThanOrEqual(height - 12);
    const fit = await p.locator('#results').evaluate((e) => {
      const style = getComputedStyle(e);
      return {
        height: e.clientHeight,
        scroll: e.scrollHeight,
        top: parseFloat(style.paddingTop),
        bottom: parseFloat(style.paddingBottom),
        radius: parseFloat(style.borderRadius),
      };
    });
    expect(fit.radius).toBe(12);
    expect(fit.top).toBeGreaterThanOrEqual(24);
    expect(fit.bottom).toBeGreaterThanOrEqual(24);
    // When content fits, the card must shrink to it rather than add a large
    // blank lower region. Overflow remains within the bounded card otherwise.
    if (fit.scroll === fit.height) {
      const gap = await p.locator('#results').evaluate((e) => {
        const parent = e.getBoundingClientRect(),
          back = e.querySelector('#back')!.getBoundingClientRect();
        return parent.bottom - back.bottom;
      });
      expect(gap).toBeLessThanOrEqual(fit.bottom + 2);
    }
    expect(
      await p
        .locator('#results')
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    await expect(p.locator('#back')).not.toContainText('ESC');
    await expect(p.locator('#retry')).toBeHidden();
    await expect(p.locator('#retry')).toBeDisabled();
    await p.keyboard.press('Enter');
    await expect(p.locator('#results')).toBeVisible();
    await expect(p.locator('#result-song')).toBeInViewport();
    await p.screenshot({
      path: test.info().outputPath(`a39-result-${width}-top.png`),
    });
    await p.locator('#watch-replay').scrollIntoViewIfNeeded();
    await expect(p.locator('#watch-replay')).toBeInViewport();
    await p.screenshot({
      path: test.info().outputPath(`a39-result-${width}-bottom.png`),
    });
    await p.click('#watch-replay');
    await p.waitForFunction(() =>
      Boolean(
        (window as any).orvioDiagnostics?.active &&
        (window as any).orvioDiagnostics?.replayActive,
      ),
    );
    await p.waitForFunction(() => (window as any).orvioAudioTime > 1);
    await expect(p.locator('#game')).toBeVisible();
    await expect(p.locator('#replay-playing')).toBeInViewport();
    await p.screenshot({
      path: test.info().outputPath(`a39-replay-${width}.png`),
    });
    await expect(p.locator('#exit')).not.toContainText('ESC');
    expect(
      await p
        .locator('#exit')
        .evaluate((e) => e.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    if (width === 844)
      await expect(p.locator('#results')).toBeVisible({ timeout: 50000 });
    else {
      await p.click('#exit');
      await expect(p.locator('#results')).toBeVisible();
    }
    await expect(p.locator('#replay-playing')).toBeHidden();
  }
  await p.goto(baseURL + '/play/first-light/5/low/');
  await expect(p.locator('#ready-start')).toBeDisabled();
  await p.keyboard.press('Enter');
  await expect(p.locator('#ready-screen')).toBeVisible();
  expect(
    await p.evaluate(() => Boolean((window as any).orvioDiagnostics?.active)),
  ).toBe(false);
  await p.goto(baseURL + '/select/');
  await expect(p.locator('#start')).toBeDisabled();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  expect(
    await p.evaluate(() => Boolean((window as any).orvioDiagnostics?.active)),
  ).toBe(false);
  await p.setViewportSize({ width: 1024, height: 768 });
  await expect(p.locator('#start')).toBeDisabled();
  expect(errors).toEqual([]);
  await context.close();
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    hasTouch: false,
  });
  const d = await desktop.newPage();
  await d.goto(baseURL + '/result/#' + fragment);
  await expect(d.locator('#retry')).toBeEnabled();
  expect(
    await d
      .locator('#results')
      .evaluate((e) => e.getBoundingClientRect().width),
  ).toBeLessThan(1280);
  await d.click('#retry');
  await d.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  expect(
    await d.evaluate(() =>
      Boolean((window as any).orvioDiagnostics?.replayActive),
    ),
  ).toBe(false);
  await desktop.close();
});

test('A39 long external result title and all locales wrap in narrow fullscreen with reachable touch replay/back', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto('/select/');
  const f = JSON.parse(
    fs.readFileSync('e2e/fixtures/v027-synthetic-fixture.json', 'utf8'),
  );
  const original = await externalResultFixtureFragment(page, f.records[0].raw);
  const longFragment = await page.evaluate(async (fragment) => {
    const { decodeExternalShare, encodeExternalShare } = await import(
      /* @vite-ignore */ String('/src/external-share.ts')
    );
    const d = await decodeExternalShare(fragment);
    d.title =
      '아주 긴 노래 제목 Long YouTube Music Video Title - Überlange musikalische Sonderausgabe 日本語の曲名 中文歌曲名稱 ' +
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(4);
    return encodeExternalShare(d);
  }, original);
  const c = await browser.newContext({
    viewport: { width: 320, height: 568 },
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
  });
  const p = await c.newPage();
  await p.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
    r.fulfill({
      status: 404,
      body: '{}',
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  );
  await p.goto(baseURL + '/result/#' + longFragment);
  await expect(p.locator('#results')).toBeVisible();
  for (const language of [
    'ko',
    'en',
    'de',
    'fr',
    'ru',
    'vi',
    'ja',
    'zh',
    'es',
    'pt',
    'it',
    'id',
    'tr',
  ]) {
    await p.evaluate((lang) => {
      Object.defineProperty(navigator, 'languages', {
        get: () => [lang],
        configurable: true,
      });
      window.dispatchEvent(new Event('languagechange'));
    }, language);
    await p.locator('#results').evaluate((e) => (e.scrollTop = 0));
    expect(
      await p
        .locator('#results')
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    const title = await p
      .locator('#result-song')
      .evaluate((e) => ({ w: e.clientWidth, sw: e.scrollWidth }));
    expect(title.sw).toBeLessThanOrEqual(title.w + 1);
    await p.locator('#watch-replay').scrollIntoViewIfNeeded();
    await expect(p.locator('#watch-replay')).toBeInViewport();
    await p.locator('#back').scrollIntoViewIfNeeded();
    await expect(p.locator('#back')).toBeInViewport();
    if (language === 'de') {
      await p.screenshot({
        path: test.info().outputPath('a39-longtitle-de-320-bottom.png'),
      });
      await p.locator('#results').evaluate((e) => (e.scrollTop = 0));
      await p.screenshot({
        path: test.info().outputPath('a39-longtitle-de-320-top.png'),
      });
    }
  }
  await c.close();
});
