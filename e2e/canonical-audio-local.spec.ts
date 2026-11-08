import { test, expect } from '@playwright/test';
test('no-job/expired-job canonical audio GET saves exact validated WAV without inventing a job; local reload works offline', async ({
  page,
}) => {
  await page.route('**/retained-fixture', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<html><body>fixture</body></html>',
    }),
  );
  await page.goto('/retained-fixture');
  const result = await page.evaluate(async () => {
    const { reconcileCanonical, verifiedLocalCanonical } = await import(
      /* @vite-ignore */ String('/src/canonical-reconcile.ts')
    );
    const { saveLocalAudio, localAudio, localMetadata } = await import(
      /* @vite-ignore */ String('/src/external-local.ts')
    );
    const { inspectDeviceAudio } = await import(
      /* @vite-ignore */ String('/src/device-audio-inspection.ts')
    );
    const { chartSetHash } = await import(
      /* @vite-ignore */ String('/src/external-source.ts')
    );
    const { FAMILY_CHART_KEYS, difficultyForChart } = await import(
      /* @vite-ignore */ String('/src/chart-difficulty.ts')
    );
    const wav = new ArrayBuffer(192044),
      v = new DataView(wav);
    for (const [offset, word] of [
      [0, 'RIFF'],
      [8, 'WAVE'],
      [12, 'fmt '],
      [36, 'data'],
    ] as const)
      for (let i = 0; i < 4; i++) v.setUint8(offset + i, word.charCodeAt(i));
    v.setUint32(4, wav.byteLength - 8, true);
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 2, true);
    v.setUint32(24, 48000, true);
    v.setUint32(28, 192000, true);
    v.setUint16(32, 4, true);
    v.setUint16(34, 16, true);
    v.setUint32(40, 192000, true);
    const hash = async (b: BufferSource) =>
      Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', b)),
        (x) => x.toString(16).padStart(2, '0'),
      ).join('');
    const notes = [{ id: 0, lane: 0, time: 0.5 }],
      sha = await hash(wav),
      noteHash = await hash(new TextEncoder().encode(JSON.stringify(notes)));
    const outcomes = [];
    const original = window.fetch;
    for (const [videoId, jobId] of [
      ['AAAAAAAAAAA', undefined],
      ['BBBBBBBBBBB', 'expired-job'],
    ] as const) {
      const record: any = {
        version: 1,
        videoId,
        audioSha256: sha,
        frames: 48000,
        sampleRate: 48000,
        estimatedBpm: 120,
        pipelineVersion: 'fixture',
        analyzerVersion: 'fixture',
        config: '{}',
        charts: Object.fromEntries(
          FAMILY_CHART_KEYS.map((k: string) => [
            k,
            { notes, sha256: noteHash },
          ]),
        ),
        chartMetadata: Object.fromEntries(
          FAMILY_CHART_KEYS.map((k: string) => [
            k,
            difficultyForChart(notes, 1, k),
          ]),
        ),
      };
      record.chartSetSha256 = await chartSetHash(record);
      const raw = JSON.stringify(record),
        rawHash = await hash(new TextEncoder().encode(raw));
      const calls: string[] = [];
      window.fetch = async (url: any, init?: RequestInit) => {
        if (init?.method && init.method !== 'GET')
          throw Error('Unexpected mutation');
        calls.push(String(url));
        if (String(url).endsWith('/audio'))
          return new Response(wav, {
            headers: {
              'Content-Type': 'audio/wav',
              'Content-Length': String(wav.byteLength),
              'X-Content-SHA256': sha,
              'X-Canonical-Audio-SHA256': sha,
              'X-Source-Video-Id': videoId,
              'X-Audio-Contract': 'audio/1',
            },
          });
        if (String(url).endsWith(videoId))
          return new Response(raw, {
            headers: {
              'X-SourceRecord-SHA256': rawHash,
              'X-ChartSet-SHA256': record.chartSetSha256,
              'X-Canonical-Audio-SHA256': sha,
              'X-Canonical-Audio-Cached': 'true',
            },
          });
        throw Error('Unexpected old job retrieval');
      };
      const recovered = await reconcileCanonical(
        {
          videoId,
          title: 'Fixture',
          archiveId: 'archive',
          state: 'loading',
          jobId,
        },
        new AbortController().signal,
      );
      await saveLocalAudio(
        recovered.record,
        recovered.title,
        recovered.jobId,
        recovered.bytes,
      );
      const local = await localAudio(record),
        meta = await localMetadata(record);
      window.fetch = async () => {
        throw Error('Must work offline');
      };
      const ready = await verifiedLocalCanonical(videoId);
      const diagnostic = await inspectDeviceAudio(videoId);
      outcomes.push({
        calls,
        expectedJob: jobId ?? null,
        actualJob: local?.jobId ?? null,
        metadataJob: meta?.jobId ?? null,
        exact: !!ready && (await hash(ready.local.bytes)) === sha,
        charts: Object.keys(ready!.record.charts).length,
        diagnostic,
      });
    }
    window.fetch = original;
    return outcomes;
  });
  for (const outcome of result) {
    expect(outcome.calls).toHaveLength(2);
    expect(
      outcome.calls.every(
        (url) =>
          url.includes('/chart-sources/') && !url.includes('/audio-jobs/'),
      ),
    ).toBe(true);
    expect(outcome.actualJob).toBe(outcome.expectedJob);
    expect(outcome.metadataJob).toBe(outcome.expectedJob);
    expect(outcome.exact).toBe(true);
    expect(outcome.charts).toBe(8);
    expect(outcome.diagnostic).toBe('ready');
  }
});
