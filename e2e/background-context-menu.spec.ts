import { test, expect } from '@playwright/test';
test('real background loading/error rows context removal supports keyboard, cancel and completion without resurrection', async ({
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
  const menu = page.locator('.library-context-menu');
  const remove = menu.locator('[data-action="remove"]');
  const share = menu.locator('[data-action="share"]');
  const removeUnavailableRow = async () => {
    await expect(menu).toBeVisible();
    await expect(share).toBeHidden();
    await expect(remove).toBeVisible();
    await expect(remove).toBeEnabled();
    await expect(menu.getByRole('menuitem')).toHaveCount(1);
    await remove.click();
  };
  const posts: string[] = [];
  let failCanonical = false;
  let releaseAudio!: () => void;
  let audioGate: Promise<void> | undefined = new Promise<void>((resolve) => {
    releaseAudio = resolve;
  });
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
        if (record.id === 'BBBBBBBBBBB' && audioGate) await audioGate;
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
  const submit = async (id: string) => {
    await page.click('#add-youtube');
    await page.fill('#youtube-url', 'https://youtu.be/' + id);
    await page.click('#youtube-submit');
  };
  await submit('BBBBBBBBBBB');
  const loading = page.locator('[data-import-video="BBBBBBBBBBB"]');
  await expect(loading).toHaveAttribute('data-state', 'loading');
  // The fixture holds the audio response. Wait for that real loading phase,
  // rather than focus a transient checking row that the phase change replaces.
  await expect(loading).toHaveAttribute('data-import-stage', 'downloading');
  await loading.focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.locator('.library-context-menu')).toBeVisible();
  await removeUnavailableRow();
  await page.click('#remove-song-cancel');
  await expect(loading).toBeVisible();
  await loading.click({ button: 'right', force: true });
  await removeUnavailableRow();
  await page.click('#remove-song-confirm');
  await expect(loading).toHaveCount(0);
  releaseAudio();
  audioGate = undefined;
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { savedCanonical } = await import(
          /* @vite-ignore */ String('/src/canonical-library.ts')
        );
        const { localAudio } = await import(
          /* @vite-ignore */ String('/src/external-local.ts')
        );
        const r = await savedCanonical('BBBBBBBBBBB');
        return Boolean(r && (await localAudio(r)));
      }),
    )
    .toBe(true);
  await expect(page.locator('#songs')).not.toContainText('BBBBBBBBBBB');
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('orvio.library-hidden.v1') || '[]'),
    ),
  ).toContain('yt:BBBBBBBBBBB');
  const installed = await page.evaluate(async () => {
    const { savedCanonical } = await import(
      /* @vite-ignore */ String('/src/canonical-library.ts')
    );
    const { localAudio } = await import(
      /* @vite-ignore */ String('/src/external-local.ts')
    );
    const r = await savedCanonical('BBBBBBBBBBB');
    return Boolean(r && (await localAudio(r)));
  });
  expect(installed).toBe(true);
  await page.reload();
  await expect(page.locator('#songs')).not.toContainText('BBBBBBBBBBB');
  await submit('BBBBBBBBBBB');
  await expect(page.locator('#songs')).toContainText('BBBBBBBBBBB');
  await expect(page.locator('[data-import-video="BBBBBBBBBBB"]')).toHaveCount(
    0,
  );
  failCanonical = true;
  await submit('AAAAAAAAAAA');
  const error = page.locator('[data-import-video="AAAAAAAAAAA"]');
  await expect(error).toHaveAttribute('data-state', 'error');
  await error.focus();
  await page.keyboard.press('Shift+F10');
  await page.keyboard.press('Escape');
  await expect(error).toBeFocused();
  await error.click({ button: 'right' });
  await removeUnavailableRow();
  await page.click('#remove-song-cancel');
  await expect(error).toBeVisible();
  await error.click({ button: 'right' });
  await removeUnavailableRow();
  await page.screenshot({
    path: test.info().outputPath('a25-real-background-error-confirm.png'),
  });
  await page.click('#remove-song-confirm');
  await expect(error).toHaveCount(0);
  await page.reload();
  await expect(error).toHaveCount(0);
  expect(posts).toEqual([]);
});
