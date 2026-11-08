import { test, expect } from '@playwright/test';
test('browser job GET overrides POST echo and frozen server pin wins before local generation', async ({
  page,
}) => {
  await page.route('**/priority-fixture', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<html><body>fixture</body></html>',
    }),
  );
  await page.goto('/priority-fixture');
  const results = await page.evaluate(async () => {
    const { createAudioJob } = await import(
      /* @vite-ignore */ String('/src/external-audio-api.ts')
    );
    const { prepareClientJob } = await import(
      /* @vite-ignore */ String('/src/prepare-local-job.ts')
    );
    const { prepareExternalJob } = await import(
      /* @vite-ignore */ String('/src/external-source-flow.ts')
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
    for (const mode of ['server', 'client'] as const) {
      const videoId = mode === 'server' ? 'SERVERJOIN1' : 'FROZENPIN01';
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
      let posts = 0;
      const job = {
        jobId: 'cached-' + mode,
        status: 'done',
        generationMode: mode,
        canonical: {
          status: mode === 'server' ? 'published' : 'client_generation',
          audioSha256: mode === 'server' ? sha : 'f'.repeat(64),
        },
        audio: {
          sha256: mode === 'server' ? sha : 'f'.repeat(64),
          sizeBytes: wav.byteLength,
          contentType: 'audio/wav',
          durationSec: 1,
          contractVersion: 'audio/1',
          expiresAt: null,
        },
      };
      window.fetch = async (url: any, init?: RequestInit) => {
        if (init?.method === 'POST') {
          posts++;
          if (JSON.parse(String(init.body)).generationMode !== 'client')
            throw Error('Wrong POST mode');
          return new Response(
            JSON.stringify({
              ...job,
              generationMode: 'client',
              canonical: {
                status: 'client_generation',
                audioSha256: job.audio.sha256,
              },
            }),
          );
        }
        if (init?.method && init.method !== 'GET')
          throw Error('Unexpected mutation');
        const path = new URL(String(url), location.origin).pathname;
        calls.push(path);
        if (path.endsWith('/audio'))
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
        if (path.includes('/audio-jobs/'))
          return new Response(JSON.stringify(job));
        if (path.endsWith(videoId))
          return new Response(raw, {
            headers: {
              'X-SourceRecord-SHA256': rawHash,
              'X-ChartSet-SHA256': record.chartSetSha256,
              'X-Canonical-Audio-SHA256': sha,
              'X-Canonical-Audio-Cached': 'true',
            },
          });
        throw Error('Unexpected route ' + path);
      };
      let workers = 0;
      const NativeWorker = window.Worker;
      window.Worker = class {
        constructor() {
          workers++;
          throw Error('Must not generate locally');
        }
      } as any;
      try {
        const echo = await createAudioJob(
          'https://www.youtube.com/watch?v=' + videoId,
          new AbortController().signal,
          'client',
        );
        if (echo.generationMode !== 'client')
          throw Error('Expected client POST echo');
        const maybe = await prepareClientJob(
          videoId,
          job.jobId,
          new AbortController().signal,
        );
        const out =
          maybe ??
          (await prepareExternalJob(
            videoId,
            job.jobId,
            new AbortController().signal,
          ));
        outcomes.push({
          mode,
          posts,
          clientDeclined: maybe === null,
          hash: await hash(out.bytes),
          expected: sha,
          recordHash: out.record.audioSha256,
          workers,
          calls,
          canonical: JSON.parse(
            localStorage.getItem('orvio.canonical-library.v1') || '[]',
          ).find((r: any) => r.videoId === videoId),
          local: localStorage.getItem('orvio.local-generated-library.v1'),
        });
      } finally {
        window.Worker = NativeWorker;
      }
    }
    return outcomes;
  });
  for (const r of results) {
    expect(r.posts).toBe(1);
    expect(r.workers).toBe(0);
    expect(r.hash).toBe(r.expected);
    expect(r.recordHash).toBe(r.expected);
    expect(r.canonical.audioSha256).toBe(r.expected);
    expect(r.local).toBeNull();
  }
  expect(results[0].clientDeclined).toBe(true);
  expect(
    results[0].calls.filter((p) => p.includes('/audio-jobs/')),
  ).toHaveLength(3);
  expect(results[1].clientDeclined).toBe(false);
  expect(results[1].calls.at(-1)).toBe('/v1/chart-sources/FROZENPIN01/audio');
  expect(results[1].calls.some((p) => p.includes('/audio-sources/'))).toBe(
    false,
  );
  console.log('BROWSER_JOB_PRIORITY', JSON.stringify(results));
});
