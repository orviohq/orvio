import { test, expect } from '@playwright/test';
test('checking to downloading preserves keyboard context row identity', async ({
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
  let releaseRecord!: () => void;
  const recordGate = new Promise<void>((resolve) => {
    releaseRecord = resolve;
  });
  await page.route('https://i.ytimg.com/**', (r) => r.fulfill({ status: 404 }));
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
      if (record.id === 'BBBBBBBBBBB' && !url.includes('youtube-metadata'))
        await recordGate;
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
  await expect(loading).toHaveAttribute('data-import-stage', 'checking');
  await loading.focus();
  await loading.evaluate((el) => {
    (window as any).__focusedPending = el;
  });
  expect(await loading.evaluate((el) => document.activeElement === el)).toBe(
    true,
  );
  releaseRecord();
  await expect(loading).toHaveAttribute('data-import-stage', 'downloading');
  const transition = await loading.evaluate((el) => ({
    sameNode: el === (window as any).__focusedPending,
    oldConnected: (window as any).__focusedPending.isConnected,
    focused: document.activeElement === el,
    activeTag: document.activeElement?.tagName,
  }));
  await page.keyboard.press('Shift+F10');
  const menuVisible = await page.locator('.library-context-menu').isVisible();
  console.log(
    'FOCUS_COUNTEREXAMPLE',
    JSON.stringify({ transition, menuVisible }),
  );
  expect(transition.sameNode).toBe(false);
  expect(transition.oldConnected).toBe(false);
  expect(transition.focused).toBe(true);
  expect(menuVisible).toBe(true);
  expect(posts).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath('context-focus-preserved.png'),
  });
  releaseAudio();
});

test('row focus restore refuses removed/changed identity, modal or successor focus; matches exact surviving action', async ({
  page,
}) => {
  await page.goto('/select/');
  const result = await page.evaluate(async () => {
    const { captureLibraryRowFocus } = await import(
      /* @vite-ignore */ String('/src/library-row-focus.ts')
    );
    const host = document.createElement('section');
    document.body.append(host);
    const render = (key = 'yt:AAAAAAAAAAA', action = 'retry') => {
      host.innerHTML = `<div tabindex="0" data-library-focus-key="${key}"><button data-library-focus-action="${action}">Retry</button></div>`;
      return host.firstElementChild as HTMLElement;
    };
    const cases: Record<string, boolean> = {};
    let row = render();
    row.focus();
    let restore = captureLibraryRowFocus(host, true);
    render('yt:BBBBBBBBBBB');
    restore(true);
    cases.changed = document.activeElement === document.body;
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    host.replaceChildren();
    restore(true);
    cases.removed = document.activeElement === document.body;
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    const next = render();
    const other = document.createElement('button');
    document.body.append(other);
    other.focus();
    restore(true);
    cases.successor = document.activeElement === other;
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    render();
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<button>Close</button>';
    document.body.append(dialog);
    dialog.showModal();
    const focused = document.activeElement;
    restore(true);
    cases.modal = document.activeElement === focused;
    dialog.close();
    dialog.remove();
    row = render();
    const old = row.querySelector('button')!;
    old.focus();
    restore = captureLibraryRowFocus(host, true);
    const replacement = render();
    restore(true);
    cases.action =
      document.activeElement === replacement.querySelector('button');
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    render();
    restore(false);
    cases.screen = document.activeElement === document.body;
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    render().hidden = true;
    restore(true);
    cases.hidden = document.activeElement === document.body;
    row = render();
    row.querySelector('button')!.focus();
    restore = captureLibraryRowFocus(host, true);
    render('yt:AAAAAAAAAAA', 'inspect');
    restore(true);
    cases.missingAction = document.activeElement === document.body;
    host.remove();
    other.remove();
    return cases;
  });
  expect(result).toEqual({
    changed: true,
    removed: true,
    successor: true,
    modal: true,
    action: true,
    screen: true,
    hidden: true,
    missingAction: true,
  });
});
