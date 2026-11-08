import { test, expect } from '@playwright/test';
test('integrated replay collection preserves all sessions and follow-on controls', async ({
  page,
}) => {
  await page.route('**/order-fixture', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
  await page.goto('/order-fixture');
  const fixture = await page.evaluate(async () => {
    const { chartSetHash } = await import(
      /* @vite-ignore */ String('/src/external-source.ts')
    );
    const { FAMILY_CHART_KEYS, difficultyForChart } = await import(
      /* @vite-ignore */ String('/src/chart-difficulty.ts')
    );
    const bytes = new Uint8Array(192044),
      v = new DataView(bytes.buffer);
    for (const [o, w] of [
      [0, 'RIFF'],
      [8, 'WAVE'],
      [12, 'fmt '],
      [36, 'data'],
    ] as const)
      for (let i = 0; i < 4; i++) v.setUint8(o + i, w.charCodeAt(i));
    v.setUint32(4, bytes.length - 8, true);
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 2, true);
    v.setUint32(24, 48000, true);
    v.setUint32(28, 192000, true);
    v.setUint16(32, 4, true);
    v.setUint16(34, 16, true);
    v.setUint32(40, 192000, true);
    const hash = async (b: BufferSource) =>
      [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    const sha = await hash(bytes),
      notes = [{ id: 0, time: 0.5, lane: 0 }],
      noteSha = await hash(new TextEncoder().encode(JSON.stringify(notes)));
    const records = [];
    for (const id of ['AAAAAAAAAAA', 'BBBBBBBBBBB']) {
      const record: any = {
        version: 1,
        videoId: id,
        audioSha256: sha,
        frames: 48000,
        sampleRate: 48000,
        estimatedBpm: 120,
        pipelineVersion: 'fixture',
        analyzerVersion: 'fixture',
        config: '{}',
        charts: Object.fromEntries(
          FAMILY_CHART_KEYS.map((k: any) => [k, { notes, sha256: noteSha }]),
        ),
        chartMetadata: Object.fromEntries(
          FAMILY_CHART_KEYS.map((k: any) => [
            k,
            difficultyForChart(notes, 1, k),
          ]),
        ),
      };
      record.chartSetSha256 = await chartSetHash(record);
      const raw = JSON.stringify(record);
      records.push({
        id,
        raw,
        rawSha: await hash(new TextEncoder().encode(raw)),
        chartSet: record.chartSetSha256,
      });
    }
    return { records, bytes: Array.from(bytes), sha };
  });
  const audio = Buffer.from(fixture.bytes);
  const posts: string[] = [];
  let failCanonical = false;
  await page.route(
    'https://orvio-share.pn-26f.workers.dev/**',
    async (route) => {
      const url = route.request().url();
      if (route.request().method() !== 'GET') {
        posts.push(url);
        throw Error('No POST permitted');
      }
      if (
        failCanonical &&
        url.includes('AAAAAAAAAAA') &&
        !url.endsWith('/audio')
      )
        return route.fulfill({
          status: 503,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: '{}',
        });
      const record = fixture.records.find((r) => url.includes(r.id));
      if (!record) return route.fulfill({ status: 404, body: '{}' });
      if (url.endsWith('/audio')) {
        if (record.id === 'BBBBBBBBBBB')
          await new Promise((r) => setTimeout(r, 1000));
        return route.fulfill({
          body: audio,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': '*',
            'Content-Type': 'audio/wav',
            'Content-Length': String(audio.length),
            'X-Content-SHA256': fixture.sha,
            'X-Canonical-Audio-SHA256': fixture.sha,
            'X-Source-Video-Id': record.id,
            'X-Audio-Contract': 'audio/1',
          },
        });
      }
      return route.fulfill({
        body: record.raw,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': '*',
          'Content-Type': 'application/json',
          'X-SourceRecord-SHA256': record.rawSha,
          'X-ChartSet-SHA256': record.chartSet,
          'X-Canonical-Audio-SHA256': fixture.sha,
          'X-Canonical-Audio-Cached': 'true',
        },
      });
    },
  );
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/AAAAAAAAAAA');
  await page.click('#youtube-submit');
  await expect(page.locator('[data-import-video="AAAAAAAAAAA"]')).toHaveCount(
    0,
  );
  await expect(page.locator('#youtube-url')).toHaveValue('');
  await expect(page.locator('#local-replay')).toHaveCount(0);
  const row = page.getByRole('button', { name: /YouTube · AAAAAAAAAAA/ });
  await row.click();
  await page.click('#start');
  await expect(page.locator('#results')).toBeVisible({ timeout: 15000 });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const m = await import(
          /* @vite-ignore */ String('/src/external-local.ts')
        );
        return (await m.listLocalSessions()).length;
      }),
    )
    .toBe(1);
  await page.evaluate(async () => {
    const m = await import(/* @vite-ignore */ String('/src/external-local.ts'));
    const all = await m.listLocalSessions();
    const s = await m.readLocalSession(all[0].key);
    if (!s) throw Error('missing');
    await m.saveLocalSession(s.replay, s.result);
    await m.saveLocalSession(s.replay, s.result);
  });
  await page.keyboard.press('Escape');
  await page.click('#open-replays');
  await expect(page).toHaveURL(/\/replays\/$/);
  await expect(page.locator('.replay-row')).toHaveCount(3);
  await page.screenshot({ path: '/downloads/coherent-a24-desktop.png' });
  await page.reload();
  await expect(page.locator('.replay-row')).toHaveCount(3);
  await page.locator('.replay-row').first().click();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#watch-replay')).toBeEnabled();
  await page.click('#watch-replay');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  await page.keyboard.press('Escape');
  await page.goto('/replays/');
  await expect(page.locator('.replay-row')).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/downloads/coherent-a24-mobile.png' });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/select\/$/);
  await expect(page.locator('#add-youtube')).toHaveAttribute(
    'title',
    /YouTube/,
  );
  await row.click({ button: 'right' });
  await expect(page.locator('.library-context-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(posts).toEqual([]);
});
