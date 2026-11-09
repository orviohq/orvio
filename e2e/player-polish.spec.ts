import { test, expect } from '@playwright/test';
import { LANGUAGES } from '../src/i18n';
import { externalLabels } from '../src/external-labels';
import { SONGS, makeChart } from '../src/chart';
import { Engine } from '../src/engine';
import { encodeReplay, type ReplayData } from '../src/replay';
test('all locales remove own-estimate/rules UI, hide auto-FEVER control and keep localized icon add flow', async ({
  page,
}) => {
  for (const language of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    await page.addInitScript(
      (lang) =>
        localStorage.setItem(
          'orvio.settings.v1',
          JSON.stringify({
            language: lang,
            languageMode: 'manual',
            feverAuto: false,
          }),
        ),
      language,
    );
    await page.goto('/select/');
    const add = page.locator('#add-youtube');
    await expect(add).toHaveAttribute(
      'aria-label',
      externalLabels(language).add,
    );
    await expect(add.locator('svg')).toHaveCount(1);
    expect(await add.innerText()).toBe('');
    expect((await add.boundingBox())!.width).toBe(44);
    await add.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#youtube-import')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.click('#open-settings');
    await expect(page.locator('#fever-auto')).toHaveCount(0);
    await expect(page.locator('#reduced-motion')).toBeVisible();
    await page.locator('#settings .close').click();
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(
      /Orvio (?:estimate|자체|独自|自有|tahmini)|(?:Estimation|Estimativa|Stima|Perkiraan|Ước tính) Orvio/,
    );
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: test.info().outputPath('coherent-a21-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath('coherent-a21-mobile.png'),
  });
});
test('new gameplay ignores previously saved auto-FEVER off while new replay metadata stays automatic', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'orvio.settings.v1',
      JSON.stringify({ feverAuto: false }),
    ),
  );
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const d = await page.evaluate(() => (window as any).orvioDiagnostics);
  console.log('FEVER diagnostic', JSON.stringify(d.fever));
  expect(d.fever.metadata.auto).toBe(true);
});
test('recent pending adds precede defaults after reload without promoting duplicate retry', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'orvio.library-add-order.v1',
      JSON.stringify(['BBBBBBBBBBB', 'AAAAAAAAAAA']),
    );
    localStorage.setItem(
      'orvio.pending-imports.v1',
      JSON.stringify([
        {
          videoId: 'AAAAAAAAAAA',
          title: 'Older add',
          state: 'error',
          error: 'request_timeout',
        },
        {
          videoId: 'BBBBBBBBBBB',
          title: 'Newest add',
          state: 'error',
          error: 'request_timeout',
        },
      ]),
    );
  });
  await page.goto('/select/');
  const titles = () =>
    page.locator('#songs .song-copy strong').allTextContents();
  expect((await titles()).slice(0, 2)).toEqual(['Newest add', 'Older add']);
  await page.reload();
  expect((await titles()).slice(0, 2)).toEqual(['Newest add', 'Older add']);
});

test('historical OFF replay retains recorded rules despite new automatic default', async ({
  page,
}) => {
  const fever = { version: 1, rulesId: 'orvio-auto-v1', auto: false } as const;
  const engine = new Engine(makeChart(SONGS[0], 'low', 5), fever);
  engine.update(9999);
  const replay: ReplayData = {
    version: 1,
    song: 'first-light',
    lanes: 5,
    difficulty: 'low',
    options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 0 },
    ops: [[1, 3000, 9999]],
    end: 3500,
    fever,
  };
  const j = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
    (v) => engine.events.filter((x) => x.value === v).length,
  );
  const params = new URLSearchParams({
    v: '4',
    song: 'first-light',
    keys: '5',
    diff: 'low',
    score: String(engine.score),
    acc: (engine.sum / engine.total).toFixed(2),
    combo: String(engine.maxCombo),
    j: j.join(','),
    speed: '1.5',
    shuffle: 'off',
    fade: 'off',
    seed: '0',
    r: await encodeReplay(replay),
  });
  await page.goto('/result/#' + params);
  await expect(page.locator('#watch-replay')).toBeVisible();
  await page.click('#watch-replay');
  await page.waitForFunction(
    () =>
      (window as any).orvioDiagnostics.replayActive &&
      (window as any).orvioDiagnostics.active,
  );
  expect(
    await page.evaluate(
      () => (window as any).orvioDiagnostics.fever.metadata.auto,
    ),
  ).toBe(false);
});
