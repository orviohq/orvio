import { test, expect } from '@playwright/test';
test('input clears only after ready success; delayed completion protects edited/reopened input and failures retain retry value', async ({
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
  const input = page.locator('#youtube-url');
  const add = async (id: string) => {
    await page.click('#add-youtube');
    await input.fill('https://www.youtube.com/watch?v=' + id);
    await page.click('#youtube-submit');
  };
  await add('AAAAAAAAAAA');
  await expect(input).not.toHaveValue(''); // accepted queue is not ready success
  await expect(page.locator('[data-import-video="AAAAAAAAAAA"]')).toHaveCount(
    0,
  );
  await expect(input).toHaveValue('');
  await page.click('#add-youtube');
  await expect(input).toHaveValue('');
  await page.screenshot({ path: '/downloads/a28-success-reopened-empty.png' });
  await page.click('#youtube-cancel');
  await add('BBBBBBBBBBB');
  await page.click('#add-youtube');
  await input.fill('https://www.youtube.com/watch?v=NEWNEWNEWNE');
  await page.click('#youtube-cancel');
  await expect(page.locator('[data-import-video="BBBBBBBBBBB"]')).toHaveCount(
    0,
  );
  await page.click('#add-youtube');
  await expect(input).toHaveValue(
    'https://www.youtube.com/watch?v=NEWNEWNEWNE',
  );
  await input.fill('https://www.youtube.com/watch?v=BBBBBBBBBBB');
  await page.click('#youtube-submit');
  await expect(input).toHaveValue(''); // stable cached duplicate also succeeds
  await page.click('#add-youtube');
  await input.fill('https://example.com/not-youtube');
  await page.click('#youtube-submit');
  await expect(page.locator('#youtube-import')).toBeVisible();
  await expect(input).toHaveValue('https://example.com/not-youtube');
  await page.click('#youtube-cancel');
  await page.click('#add-youtube');
  await expect(input).toHaveValue('https://example.com/not-youtube');
  await page.click('#youtube-cancel');
  failCanonical = true;
  await add('AAAAAAAAAAA');
  await expect(
    page.locator('[data-import-video="AAAAAAAAAAA"]'),
  ).toHaveAttribute('data-state', 'error');
  await page.click('#add-youtube');
  await expect(input).toHaveValue(
    'https://www.youtube.com/watch?v=AAAAAAAAAAA',
  );
  await page.screenshot({ path: '/downloads/a28-failure-input-retained.png' });
  expect(posts).toEqual([]);
});
