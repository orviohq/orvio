import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test.use({ hasTouch: true });
test('ORV61 larger art, responsive rows and real selection contracts', async ({
  page,
}) => {
  test.setTimeout(80000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
    r.fulfill({ status: 404, body: '{}' }),
  );
  await page.route('https://i.ytimg.com/**', (r) =>
    r.fulfill({
      contentType: 'image/png',
      body: fs.readFileSync('public/wallpapers/first-light.png'),
    }),
  );
  await page.goto('/select/');
  await page.evaluate(async () => {
    const { pinSource } = await import(
      /* @vite-ignore */ String('/src/external-source-store.ts')
    );
    const { saveLocalAudio } = await import(
      /* @vite-ignore */ String('/src/external-local.ts')
    );
    const { chartSetHash } = await import(
      /* @vite-ignore */ String('/src/external-source.ts')
    );
    const { rememberCanonical } = await import(
      /* @vite-ignore */ String('/src/canonical-library.ts')
    );
    const bytes = new ArrayBuffer(192044),
      v = new DataView(bytes);
    for (const [offset, word] of [
      [0, 'RIFF'],
      [8, 'WAVE'],
      [12, 'fmt '],
      [36, 'data'],
    ] as const)
      for (let i = 0; i < 4; i++) v.setUint8(offset + i, word.charCodeAt(i));
    v.setUint32(4, bytes.byteLength - 8, true);
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 2, true);
    v.setUint32(24, 48000, true);
    v.setUint32(28, 192000, true);
    v.setUint16(32, 4, true);
    v.setUint16(34, 16, true);
    v.setUint32(40, 192000, true);
    const digest = async (input: BufferSource) =>
      Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', input)),
        (x) => x.toString(16).padStart(2, '0'),
      ).join('');
    const notes = [{ id: 0, lane: 0, time: 0.5 }];
    const chart = {
      notes,
      sha256: await digest(new TextEncoder().encode(JSON.stringify(notes))),
    };
    const record = {
      version: 1,
      videoId: '1-xGerv5FOk',
      audioSha256: await digest(bytes),
      frames: 48000,
      sampleRate: 48000,
      estimatedBpm: 120,
      pipelineVersion: 'fixture',
      analyzerVersion: 'fixture',
      config: '{}',
      charts: Object.fromEntries(
        [
          '5:low',
          '5:mid',
          '5:high',
          '5:sc',
          '7:low',
          '7:mid',
          '7:high',
          '7:sc',
        ].map((k) => [k, chart]),
      ),
    } as any;
    record.chartSetSha256 = await chartSetHash(record);
    for (let i = 0; i < 8; i++) {
      record.videoId = 'TESTSONG' + String(i).padStart(3, '0');
      record.chartSetSha256 = await chartSetHash(record);
      await pinSource(record);
      await saveLocalAudio(
        record,
        i === 0
          ? '꿈과 밤의 경계 / An exceptionally long multilingual song title with no loss of identity'
          : 'Night Drive ' + (i + 1),
        undefined,
        bytes,
        'Test Artist',
      );
      await rememberCanonical(record, 'b'.repeat(64));
    }
  });
  await page.reload();
  await expect(page.locator('#songs>[data-song]')).toHaveCount(11);
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync('/downloads/orv61', { recursive: true });
  for (const [w, h] of [
    [1280, 800],
    [979, 1173],
    [768, 1024],
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.locator('#songs>[data-song]').first().click();
    await page.evaluate(() => document.fonts.ready);
    const dims = await page
      .locator('#songs>[data-song]')
      .first()
      .evaluate((e) => {
        const r = e.getBoundingClientRect(),
          art = e.querySelector('.cover')!.getBoundingClientRect(),
          title = e.querySelector('strong')!.getBoundingClientRect();
        return {
          art: art.width,
          ratio: art.width / art.height,
          overflow: e.scrollWidth > e.clientWidth + 1,
          right: r.right,
          titleRight: title.right,
        };
      });
    expect(dims.art).toBeGreaterThanOrEqual(112);
    expect(Math.abs(dims.ratio - 16 / 9)).toBeLessThan(0.01);
    expect(dims.overflow).toBe(false);
    expect(dims.right).toBeLessThanOrEqual(w);
    expect(dims.titleRight).toBeLessThanOrEqual(dims.right);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/downloads/orv61/list-${w}x${h}.png`,
      fullPage: true,
    });
    const listBox = await page.locator('#songs').boundingBox();
    expect(listBox!.height).toBeGreaterThan(60);
    await page.locator('#start').scrollIntoViewIfNeeded();
    await expect(page.locator('#start')).toBeInViewport();
    const start = await page.locator('#start').boundingBox();
    expect(start!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `/downloads/orv61/controls-${w}x${h}.png` });
    await page.locator('#songs>[data-song]').last().click();
    await page.locator('#songs').scrollIntoViewIfNeeded();
    const last = await page.locator('#songs>.selected').evaluate((e) => {
      const r = e.getBoundingClientRect(),
        p = e.parentElement!.getBoundingClientRect();
      return r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
    });
    console.log(
      'last-visible',
      w,
      h,
      last,
      await page.locator('#songs').evaluate((e) => ({
        height: e.clientHeight,
        scroll: e.scrollTop,
        full: e.scrollHeight,
      })),
    );
    expect(last).toBe(true);
  }
  console.log('visuals done');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('#songs>[data-song]').first().click();
  const first = await page
    .locator('.song-card.selected')
    .getAttribute('data-song');
  await page.keyboard.press('ArrowDown');
  expect(
    await page.locator('.song-card.selected').getAttribute('data-song'),
  ).not.toBe(first);
  await page.reload();
  expect(
    await page.locator('.song-card.selected').getAttribute('data-song'),
  ).not.toBe(first);
  console.log('selection done');
  for (const lanes of [5, 7])
    for (const diff of ['low', 'mid', 'high', 'sc']) {
      await page.click(`[data-lanes="${lanes}"]`);
      await page.click(`[data-diff="${diff}"]`);
      const expected = await page.evaluate(
        async ({ lanes, diff }) => {
          const { SONGS, makeChart } = await import(
            /* @vite-ignore */ String('/src/chart.ts')
          );
          return SONGS.map(
            (s: any) => makeChart(s, diff as any, lanes as any).length,
          );
        },
        { lanes, diff },
      );
      for (const row of await page
        .locator('#songs>[data-song]')
        .evaluateAll((es) =>
          es.map((e) => ({
            index: Number((e as HTMLElement).dataset.song),
            label: e.querySelector('.song-note-count')!.textContent,
          })),
        ))
        expect(row.label).toBe(`${expected[row.index] || '--'} 노트`);
    }
  console.log('counts done');
  await page.locator('#songs>[data-song]').first().click({ button: 'right' });
  await expect(page.locator('.library-context-menu')).toBeVisible();
  await expect(
    page.locator('.library-context-menu [data-action=share]'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#songs>[data-song]').last().click();
  const visible = await page.locator('#songs>.selected').evaluate((e) => {
    const r = e.getBoundingClientRect(),
      b = e.parentElement!.getBoundingClientRect();
    return r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
  });
  expect(visible).toBe(true);
  const beforeReplay = await page
    .locator('.song-card.selected strong')
    .textContent();
  await page.click('#open-replays');
  await page.click('#replays-back');
  await expect(page.locator('.song-card.selected strong')).toHaveText(
    beforeReplay!,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const row = page.locator('#songs>[data-song]').first();
  await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  await page.touchscreen.tap(box!.x + 40, box!.y + 40);
  await expect(row).toHaveClass(/selected/);
  await row.focus();
  await page.keyboard.press('Shift+F10');
  await expect(
    page.locator('.library-context-menu [data-action=share]'),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
