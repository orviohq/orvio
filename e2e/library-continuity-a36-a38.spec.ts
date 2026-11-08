import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test('A33 A34 A36 A38 stable selection contextual removal and current per-song counts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/select/');
  await page.locator('[data-song="1"]').click();
  await page.click('#start');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await expect(page.locator('#selected-title')).toHaveText('Afterimage');
  await expect(page.locator('.song-card.selected strong')).toHaveText(
    'Afterimage',
  );
  await page.click('#open-replays');
  await page.click('#replays-back');
  await expect(page.locator('.song-card.selected strong')).toHaveText(
    'Afterimage',
  );
  await page.goto('/select/');
  await expect(page.locator('.song-card.selected strong')).toHaveText(
    'Afterimage',
  );
  const fragment = JSON.parse(
    fs.readFileSync('/downloads/v027-public-proof.json', 'utf8'),
  )[0].shareCaptures[0].fragment;
  await page.goto('/result/#' + fragment);
  await expect(page.locator('#results')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.song-card.selected strong')).toHaveText(
    'Afterimage',
  );
  for (const lanes of [5, 7])
    for (const diff of ['low', 'mid', 'high', 'sc']) {
      await page.click(`[data-lanes="${lanes}"]`);
      await page.click(`[data-diff="${diff}"]`);
      const actual = await page
        .locator('#songs [data-song]')
        .evaluateAll((es) =>
          es.map((e) => ({
            index: Number((e as HTMLElement).dataset.song),
            text: e.querySelector('.song-note-count')!.textContent,
          })),
        );
      const expected = await page.evaluate(
        async ({ lanes, diff }) => {
          const { SONGS, makeChart } = await import(
            /* @vite-ignore */ String('/src/chart.ts')
          );
          return SONGS.map((s: any) => makeChart(s, diff, lanes).length);
        },
        { lanes, diff },
      );
      for (const row of actual)
        expect(row.text).toBe(`${expected[row.index]} 노트`);
    }
  await expect(
    page.locator(
      '#chart-info,.under-start,#remove-song,.library .section-title>span',
    ),
  ).toHaveCount(0);
  await page.screenshot({ path: '/downloads/a36-a38-selection-desktop.png' });
  // A canonical row is new-first, so count labels must bind dataset identity, not DOM position.
  await page.route('https://i.ytimg.com/**', (r) =>
    r.fulfill({ status: 404, body: '' }),
  );
  const f = JSON.parse(
    fs.readFileSync('/downloads/v027-synthetic-fixture.json', 'utf8'),
  );
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) => {
    if (r.request().method() !== 'GET') throw Error('No POST');
    const u = r.request().url(),
      record = f.records[0];
    if (u.endsWith('/metadata')) return r.fulfill({ status: 404, body: '{}' });
    if (u.endsWith('/audio'))
      return r.fulfill({
        body: Buffer.from(f.bytes),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': '*',
          'Content-Type': 'audio/wav',
          'Content-Length': String(f.bytes.length),
          'X-Content-SHA256': f.sha,
          'X-Canonical-Audio-SHA256': f.sha,
          'X-Source-Video-Id': record.id,
          'X-Audio-Contract': 'audio/1',
        },
      });
    return r.fulfill({
      body: record.raw,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': '*',
        'Content-Type': 'application/json',
        'X-SourceRecord-SHA256': record.rawSha,
        'X-ChartSet-SHA256': record.chartSet,
        'X-Canonical-Audio-SHA256': f.sha,
        'X-Canonical-Audio-Cached': 'true',
      },
    });
  });
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/AAAAAAAAAAA');
  await page.click('#youtube-submit');
  await expect(page.locator('#songs>[data-song]')).toHaveCount(4);
  await page.locator('#songs>[data-song]').first().click();
  await expect(page.locator('#selected-title')).toContainText('AAAAAAAAAAA');
  await page.click('[data-diff="low"]');
  await page.click('[data-lanes="5"]');
  await expect(
    page.locator('#songs>[data-song]').first().locator('.song-note-count'),
  ).toHaveText('1 노트');
  await page.click('#start');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  await page.locator('#results').waitFor({ state: 'visible', timeout: 15000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.song-card.selected strong')).toContainText(
    'AAAAAAAAAAA',
  );
  await page.click('#open-replays');
  await expect(page.locator('.replay-row')).toHaveCount(1);
  await expect(page.locator('.replay-mode')).toContainText('0:01');
  await expect(page.locator('.replay-time')).toHaveAttribute('datetime', /.+/);
  await expect(page.locator('.replay-art')).toBeHidden();
  await expect(page.locator('.replay-art-placeholder')).toBeVisible();
  await page.click('#replays-back');
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.locator('[data-song="2"]').click();
  const scroll = await page.locator('#songs').evaluate((e) => e.scrollTop);
  expect(scroll).toBeGreaterThan(0);
  await page.click('#open-replays');
  await page.click('#replays-back');
  await expect(page.locator('.song-card.selected strong')).toHaveText(
    'Violet Drive',
  );
  expect(await page.locator('#songs').evaluate((e) => e.scrollTop)).toBe(
    scroll,
  );
  await page.locator('#songs>[data-song]').first().focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.locator('.library-context-menu')).toBeVisible();
  await page.locator('.library-context-menu [data-action=remove]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#remove-song-dialog')).toBeVisible();
  await page.click('#remove-song-cancel');
  await page.locator('#songs>[data-song]').first().click({ button: 'right' });
  await page.locator('.library-context-menu [data-action=remove]').click();
  await page.click('#remove-song-confirm');
  await expect(page.locator('#songs>[data-song]')).toHaveCount(3);
  await page.goto('/select/');
  await expect(page.locator('#songs>[data-song]')).toHaveCount(3);
  await expect(page.locator('#songs')).not.toContainText('AAAAAAAAAAA');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/downloads/a36-a38-selection-mobile.png' });
  expect(errors).toEqual([]);
});
