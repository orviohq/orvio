import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { validSourceRecord, verifyChartHashes } from '../src/external-source';

const VIDEO = 'IMWT6937uUs';
const infoURL = `https://provider.fixture.invalid/v1/videos/${VIDEO}`;
const audioURL = `${infoURL}/audio?format=bestaudio%2Fbest&audio-format=wav`;
// Opt-in single acquisition. The public-approved key enters the build environment only.
test('live full app Add preserves actual title, verified audio and charts through reload and play', async ({
  page,
}) => {
  test.skip(
    process.env.ORVIO_LIVE_ACCEPTANCE !== '1',
    'Explicit one-video acceptance only',
  );
  const started = Date.now();
  const requests = { audio: 0, metadata: 0 };
  const unexpected: string[] = [],
    workers: string[] = [];
  const statuses: { kind: string; status: number; atMs: number }[] = [];
  let display: { title?: string; channel?: string } = {};
  const evidence: Record<string, unknown> = {
    videoId: VIDEO,
    requests,
    statuses,
    unexpected,
  };
  page.on('worker', (w) => workers.push(w.url()));
  page.on('response', async (r) => {
    const kind =
      r.url() === audioURL ? 'audio' : r.url() === infoURL ? 'metadata' : null;
    if (!kind) return;
    statuses.push({ kind, status: r.status(), atMs: Date.now() - started });
    if (kind === 'metadata' && r.status() === 200) {
      const value = await r.json().catch(() => null);
      if (value?.id === VIDEO)
        display = {
          title: value.title,
          channel: value.channel ?? value.uploader,
        };
    }
  });
  await page.route('**/*', async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (
      url.origin === 'http://127.0.0.1:4192' &&
      !/^\/(?:api|v\d+)(?:\/|$)/.test(url.pathname)
    )
      return route.continue();
    if (
      req.method() === 'GET' &&
      (url.href === audioURL || url.href === infoURL)
    ) {
      const kind = url.href === audioURL ? 'audio' : 'metadata';
      requests[kind]++;
      if (requests[kind] === 1) return route.continue();
    }
    unexpected.push(`${req.method()} ${url.origin}${url.pathname}`);
    return route.abort();
  });
  const snapshot = () =>
    page.evaluate(async (videoId) => {
      const all = async (name: string, version: number, store: string) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open(name, version);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        try {
          return await new Promise<any[]>((resolve, reject) => {
            const r = db
              .transaction(store, 'readonly')
              .objectStore(store)
              .getAll();
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
          });
        } finally {
          db.close();
        }
      };
      const records = await all('orvio.external-sources.v1', 1, 'records');
      const row = records.find((r) => r.record.videoId === videoId);
      if (!row) return null;
      const record = row.record;
      const audioKey = `yt-${videoId}-${record.audioSha256.slice(0, 16)}`;
      const id = `${audioKey}-c${record.chartSetSha256.slice(0, 16)}`;
      const audio = (await all('orvio.external-library.v1', 2, 'audio')).find(
        (r) => r.key === audioKey,
      );
      const metadata = (
        await all('orvio.external-library.v1', 2, 'metadata')
      ).find((r) => r.key === id);
      const hash = audio
        ? Array.from(
            new Uint8Array(await crypto.subtle.digest('SHA-256', audio.bytes)),
            (n) => n.toString(16).padStart(2, '0'),
          ).join('')
        : null;
      return {
        record,
        id,
        metadata,
        audioBytes: audio?.bytes.byteLength,
        audioHash: hash,
      };
    }, VIDEO);
  try {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/select/');
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-library-hydrating',
      /.*/,
    );
    await page.locator('#add-youtube').click();
    await page
      .locator('#youtube-url')
      .fill(`https://www.youtube.com/watch?v=${VIDEO}`);
    await page.locator('#youtube-submit').click();
    // A typed terminal error ends the wait immediately; never retry the live audio.
    await page.waitForFunction(
      (id) => {
        const rows = JSON.parse(
          localStorage.getItem('orvio.pending-imports.v1') ?? '[]',
        );
        return !rows.some(
          (r: any) => r.videoId === id && r.state === 'loading',
        );
      },
      VIDEO,
      { timeout: 195000 },
    );
    const pending = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('orvio.pending-imports.v1') ?? '[]'),
    );
    evidence.pending = pending.map((r: any) => ({
      videoId: r.videoId,
      state: r.state,
      error: r.error,
      stage: r.failure?.stage,
      status: r.failure?.status,
    }));
    expect(pending).toEqual([]);
    const saved = await snapshot();
    expect(saved).not.toBeNull();
    const r = saved!.record;
    expect(validSourceRecord(r)).toBe(true);
    expect(await verifyChartHashes(r)).toBe(true);
    expect(saved!.audioHash).toBe(r.audioSha256);
    expect(r.videoId).toBe(VIDEO);
    expect(r.sourceProvenance).toBe('local-current35-v1');
    expect(display.title).toBeTruthy();
    expect(saved!.metadata.title).toBe(display.title);
    expect(saved!.metadata.author).toBe(display.channel);
    expect(workers.some((url) => /local-chart\.worker/.test(url))).toBe(true);
    Object.assign(evidence, {
      title: saved!.metadata.title,
      channel: saved!.metadata.author,
      audioSha256: r.audioSha256,
      chartSetSha256: r.chartSetSha256,
      sampleRate: r.sampleRate,
      frames: r.frames,
      durationSeconds: r.frames / r.sampleRate,
      audioBytes: saved!.audioBytes,
      importMs: Date.now() - started,
    });
    await page.goto(`/select/?song=${encodeURIComponent(saved!.id)}`);
    await page.reload();
    await expect(page.locator('#songs .song-card.selected')).toContainText(
      display.title!,
      { timeout: 15000 },
    );
    await page.locator('[data-lanes="5"]').click();
    await expect(page.locator('[data-lanes="5"]')).toHaveClass(/selected/);
    expect(await snapshot()).toEqual(saved);
    await page.screenshot({
      path: test.info().outputPath('live-select-1280.png'),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: test.info().outputPath('live-select-390.png'),
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/play/${saved!.id}/5/low/`);
    await expect(page.locator('#loading-title')).toHaveText(display.title!);
    await page.waitForTimeout(1250);
    await page.keyboard.press('Enter');
    await expect
      .poll(
        () => page.evaluate(() => (window as any).orvioDiagnostics?.active),
        { timeout: 30000 },
      )
      .toBeTruthy();
    await expect(page.locator('#game')).toHaveAttribute('data-song', saved!.id);
    await page.screenshot({
      path: test.info().outputPath('live-play-1280.png'),
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: test.info().outputPath('live-play-390.png'),
    });
    expect(await snapshot()).toEqual(saved);
    expect(requests).toEqual({ audio: 1, metadata: 1 });
    expect(unexpected).toEqual([]);
    evidence.passed = true;
  } finally {
    evidence.totalMs = Date.now() - started;
    await page
      .screenshot({ path: test.info().outputPath('live-final.png') })
      .catch(() => {});
    fs.writeFileSync(
      test.info().outputPath('live-evidence.json'),
      JSON.stringify(evidence, null, 2),
      { mode: 0o600 },
    );
  }
});
