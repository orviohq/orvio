import { test, expect } from '@playwright/test';
test('browser consumers retain separate transfer, frozen identity and cancellation ownership', async ({
  page,
}) => {
  await page.goto('/select/');
  const proof = await page.evaluate(async () => {
    const { loadCanonicalAudio } = await import(
      /* @vite-ignore */ String('/src/canonical-audio-api.ts')
    );
    const { loadAudio } = await import(
      /* @vite-ignore */ String('/src/external-audio-api.ts')
    );
    const bytes = new ArrayBuffer(192044),
      v = new DataView(bytes);
    for (const [o, w] of [
      [0, 'RIFF'],
      [8, 'WAVE'],
      [12, 'fmt '],
      [36, 'data'],
    ] as const)
      for (let i = 0; i < 4; i++) v.setUint8(o + i, w.charCodeAt(i));
    for (const [o, x] of [
      [4, 192036],
      [16, 16],
      [24, 48000],
      [28, 192000],
      [40, 192000],
    ])
      v.setUint32(o, x, true);
    for (const [o, x] of [
      [20, 1],
      [22, 2],
      [32, 4],
      [34, 16],
    ])
      v.setUint16(o, x, true);
    const sha = [
      ...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    ]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
    const r: any = {
      videoId: 'AAAAAAAAAAA',
      audioSha256: sha,
      frames: 48000,
      sampleRate: 48000,
    };
    const h = {
      'Content-Type': 'audio/wav',
      'Content-Length': String(bytes.byteLength),
      'X-Content-SHA256': sha,
      'X-Canonical-Audio-SHA256': sha,
      'X-Source-Video-Id': r.videoId,
      'X-Audio-Contract': 'audio/1',
    };
    const original = window.fetch;
    let count = 0;
    window.fetch = async () => {
      count++;
      return new Response(bytes, { headers: h });
    };
    try {
      const [a, b] = await Promise.all([
        loadCanonicalAudio(r),
        loadCanonicalAudio(r),
      ]);
      structuredClone(a, { transfer: [a] });
      const dimensions = await Promise.allSettled([
        loadCanonicalAudio(r),
        loadCanonicalAudio({ ...r, frames: 48001 }),
      ]);
      const job: any = {
        jobId: 'ownedJob',
        status: 'done',
        audio: {
          sha256: sha,
          sizeBytes: 192044,
          durationSec: 1,
          contentType: 'audio/wav',
          contractVersion: 'audio/1',
          expiresAt: null,
        },
      };
      const [c, d] = await Promise.all([
        loadAudio(job, r.videoId, sha),
        loadAudio(job, r.videoId, sha),
      ]);
      structuredClone(c, { transfer: [c] });
      let release!: () => void;
      const ready = new Promise<void>((x) => (release = x));
      window.fetch = async (_u, init) => {
        count++;
        await ready;
        init?.signal?.throwIfAborted();
        return new Response(bytes, { headers: h });
      };
      const controller = new AbortController();
      const one = loadCanonicalAudio(r, controller.signal),
        two = loadCanonicalAudio(r, new AbortController().signal);
      controller.abort();
      release();
      const cancellation = await Promise.allSettled([one, two]);
      return {
        detached: a.byteLength,
        other: b.byteLength,
        jobDetached: c.byteLength,
        jobOther: d.byteLength,
        dimensions: dimensions.map((x) => x.status),
        cancellation: cancellation.map((x) => x.status),
        count,
      };
    } finally {
      window.fetch = original;
    }
  });
  expect(proof).toEqual({
    detached: 0,
    other: 192044,
    jobDetached: 0,
    jobOther: 192044,
    dimensions: ['fulfilled', 'rejected'],
    cancellation: ['rejected', 'fulfilled'],
    count: 8,
  });
  await page.screenshot({
    path: test.info().outputPath('orv47-browser-select.png'),
  });
  console.log('OWNERSHIP_BROWSER', JSON.stringify(proof));
});
