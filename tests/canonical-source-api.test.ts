import { it, expect, vi, afterEach } from 'vitest';
import { readCanonicalSource } from '../src/canonical-source-api';
import { chartSetHash, type SourceRecord } from '../src/external-source';
import { FAMILY_CHART_KEYS, difficultyForChart } from '../src/chart-difficulty';
const video = 'ImuWa3SJulY';
const digest = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
async function fixture() {
  const notes = [{ id: 0, lane: 0, time: 1, end: 2 }];
  const sha = await digest(JSON.stringify(notes));
  const record: SourceRecord = {
    version: 1,
    videoId: video,
    audioSha256: 'a'.repeat(64),
    sampleRate: 48000,
    frames: 48000 * 4,
    estimatedBpm: 120,
    pipelineVersion: 'fixture',
    analyzerVersion: 'fixture',
    config: '{}',
    charts: Object.fromEntries(
      FAMILY_CHART_KEYS.map((k) => [k, { notes, sha256: sha }]),
    ) as SourceRecord['charts'],
    chartMetadata: Object.fromEntries(
      FAMILY_CHART_KEYS.map((k) => [k, difficultyForChart(notes, 4, k)]),
    ),
  };
  record.chartSetSha256 = await chartSetHash(record);
  const raw = JSON.stringify(record),
    hash = await digest(raw);
  return {
    record,
    raw,
    headers: {
      'X-SourceRecord-SHA256': hash,
      'X-ChartSet-SHA256': record.chartSetSha256,
      'X-Canonical-Audio-SHA256': record.audioSha256,
      'X-Canonical-Audio-Cached': 'true',
    },
  };
}
afterEach(() => vi.unstubAllGlobals());
it('accepts exact verified 8-mode server record, not a client regeneration', async () => {
  const f = await fixture();
  const fetch = vi.fn(async () => new Response(f.raw, { headers: f.headers }));
  vi.stubGlobal('fetch', fetch);
  const result = await readCanonicalSource(video);
  expect(result).toEqual({
    state: 'ready',
    record: f.record,
    recordSha256: f.headers['X-SourceRecord-SHA256'],
    audioCached: true,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]).toHaveLength(2);
});
it('honors exact typed missing and pending states without any retry or POST', async () => {
  for (const [status, error, state] of [
    [404, 'chart_source_not_found', 'missing'],
    [202, 'chart_source_pending', 'pending'],
    [202, 'chart_source_deferred', 'deferred'],
    [202, 'chart_source_replicating', 'replicating'],
  ] as const) {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error, retryAfterSec: 15 }), { status }),
    );
    vi.stubGlobal('fetch', fetch);
    expect((await readCanonicalSource(video)).state).toBe(state);
    expect(fetch).toHaveBeenCalledTimes(1);
  }
});
it('fails closed on missing CORS-exposed identity, tampered bytes, wrong video/audio/chartSet and corrupt replica', async () => {
  const f = await fixture();
  for (const [raw, headers, status] of [
    [f.raw, {}, 200],
    [f.raw + ' ', f.headers, 200],
    [f.raw, { ...f.headers, 'X-Canonical-Audio-SHA256': 'b'.repeat(64) }, 200],
    [f.raw, { ...f.headers, 'X-ChartSet-SHA256': 'c'.repeat(64) }, 200],
    ['{"error":"chart_source_corrupt"}', {}, 409],
  ] as const) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(raw, { headers, status })),
    );
    await expect(readCanonicalSource(video)).rejects.toMatchObject({
      code: 'integrity_failed',
    });
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(f.raw, { headers: f.headers })),
  );
  await expect(readCanonicalSource('AAAAAAAAAAA')).rejects.toMatchObject({
    code: 'integrity_failed',
  });
});
it('rejects unknown pending protocol and never treats header audio cache hint as chart authority', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'anything', retryAfterSec: 15 }), {
          status: 202,
        }),
    ),
  );
  await expect(readCanonicalSource(video)).rejects.toMatchObject({
    code: 'unavailable',
  });
  const f = await fixture();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(f.raw, {
          headers: { ...f.headers, 'X-Canonical-Audio-Cached': 'false' },
        }),
    ),
  );
  expect(await readCanonicalSource(video)).toMatchObject({
    state: 'ready',
    audioCached: false,
  });
});
it('preserves typed 429 scope/reset, does not invent an audio daily quota for untyped 429, and keeps 503 a service error', async () => {
  for (const error of [
    { code: 'rate_limited', limitScope: 'ip_10m', resetAtUnixSec: 1900000000 },
    'rate_limited',
  ]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify({ error }), { status: 429 }),
      ),
    );
    await expect(readCanonicalSource(video)).rejects.toMatchObject({
      code: 'rate_limited',
      status: 429,
      limit:
        typeof error === 'object'
          ? { limitScope: 'ip_10m', resetAtUnixSec: 1900000000 }
          : undefined,
    });
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 503 })),
  );
  await expect(readCanonicalSource(video)).rejects.toMatchObject({
    code: 'unavailable',
    status: 503,
    stage: 'service',
  });
});
