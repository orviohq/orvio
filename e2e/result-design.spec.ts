import { test, expect } from '@playwright/test';
import { SONGS, makeChart } from '../src/chart';
import { LANGUAGES } from '../src/i18n';
const result = (song: string, keys = 7, diff = 'high') =>
  `/result/#v=4&song=${song}&keys=${keys}&diff=${diff}&score=500000&acc=50&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1&speed=9&shuffle=random&fade=out2&seed=123`;
test('result art, original metadata and head-note counts match each song and chart', async ({
  page,
}) => {
  for (const song of SONGS)
    for (const lanes of [5, 7] as const)
      for (const diff of ['low', 'mid', 'high'] as const) {
        await page.goto(result(song.id, lanes, diff));
        await expect(page.locator('#results')).toBeVisible();
        await expect(page.locator('#result-art')).toHaveAttribute(
          'src',
          `/wallpapers/${song.id}.png`,
        );
        await expect(page.locator('#result-metadata')).toContainText(
          `${song.bpm} BPM`,
        );
        await expect(page.locator('#result-metadata')).toContainText(
          String(makeChart(song, diff, lanes).length),
        );
        expect(
          await page
            .locator('#result-art')
            .evaluate(
              (e) =>
                (e as HTMLImageElement).complete &&
                (e as HTMLImageElement).naturalWidth > 0,
            ),
        ).toBe(true);
      }
});
test('result preview is explicit, toggles, stops on retry and is available on a direct shared result', async ({
  page,
}) => {
  await page.goto(result('afterimage'));
  await expect(page.locator('#result-preview')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.click('#result-preview');
  await expect(page.locator('#result-preview')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.click('#result-preview');
  await expect(page.locator('#result-preview')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.click('#result-preview');
  await expect(page.locator('#result-preview')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.click('#retry');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('body')).not.toHaveClass(/previewing/);
});
test('all translated result badges have accessible labels; color and responsive layouts retain every count', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 480],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    for (const lang of Object.keys(LANGUAGES)) {
      await page.evaluate(
        (lang) =>
          localStorage.setItem(
            'orvio.settings.v1',
            JSON.stringify({ language: lang, languageMode: 'manual' }),
          ),
        lang,
      );
      await page.goto(
        '/result/?lang=' +
          lang +
          result('violet-drive').slice('/result/'.length),
      );
      await expect(page.locator('#results')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      for (const kind of ['keys', 'difficulty', 'speed', 'shuffle', 'fader'])
        await expect(page.locator('.result-option-' + kind)).toHaveAttribute(
          'aria-label',
          /.+/,
        );
      await expect(page.locator('#judgment-list div')).toHaveCount(12);
      expect(
        await page
          .locator('#results')
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
        `${lang} ${width}`,
      ).toBe(true);
      expect(
        await page
          .locator('#judgment-list [data-grade="100"]')
          .evaluate((e) => getComputedStyle(e).color),
      ).not.toBe(
        await page
          .locator('#judgment-list [data-grade="0"]')
          .evaluate((e) => getComputedStyle(e).color),
      );
      await page.locator('#retry').scrollIntoViewIfNeeded();
      await expect(page.locator('#retry')).toBeInViewport();
      expect(
        await page.locator('#results').evaluate((e) => {
          const b = e.querySelector('#retry')!.getBoundingClientRect();
          const d = e.getBoundingClientRect();
          return b.top >= d.top && b.bottom <= d.bottom - 7;
        }),
      ).toBe(true);
      if (lang === 'ko' || lang === 'ru')
        await page.screenshot({
          path: `test-results/result-design-${lang}-${width}.png`,
        });
    }
  }
});
