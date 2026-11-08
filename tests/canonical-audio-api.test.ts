import { it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  loadCanonicalAudio,
  loadRetainedAudio,
} from '../src/canonical-audio-api';
import type { SourceRecord } from '../src/external-source';
import { queryClient } from '../src/query-client';
beforeEach(() => queryClient.clear());
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
const hash = async (b: ArrayBuffer) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
const sha = await hash(wav);
const record = {
  videoId: '1-xGerv5FOk',
  audioSha256: sha,
  frames: 48000,
  sampleRate: 48000,
} as SourceRecord;
const headers = {
  'Content-Type': 'audio/wav',
  'Content-Length': String(wav.byteLength),
  'X-Content-SHA256': sha,
  'X-Canonical-Audio-SHA256': sha,
  'X-Source-Video-Id': record.videoId,
  'X-Audio-Contract': 'audio/1',
};
const use = (response: Response) => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => response);
  vi.stubGlobal('fetch', fetch);
  return fetch;
};
afterEach(() => vi.unstubAllGlobals());
it('reads exact retained pin-bound WAV via one GET with no job identity and no POST', async () => {
  const fetch = use(new Response(wav, { headers }));
  expect(await loadCanonicalAudio(record)).toEqual(wav);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toContain(
    '/v1/chart-sources/1-xGerv5FOk/audio',
  );
  expect(fetch.mock.calls[0][1]?.method).toBeUndefined();
});
it('distinguishes metadata missing, bytes expired, changed, corrupt, pending, service and quota errors', async () => {
  for (const [status, error, code] of [
    [404, 'chart_source_not_found', 'not_found'],
    [410, 'audio_expired', 'audio_expired'],
    [409, 'audio_changed', 'source_changed'],
    [409, 'audio_corrupt', 'integrity_failed'],
    [202, 'chart_source_pending', 'request_timeout'],
    [202, 'chart_source_deferred', 'request_timeout'],
    [503, 'canonical_repair_unavailable', 'unavailable'],
    [429, 'rate_limited', 'rate_limited'],
  ] as const) {
    const fetch = use(
      new Response(JSON.stringify({ error, retryAfterSec: 10 }), { status }),
    );
    await expect(loadCanonicalAudio(record)).rejects.toMatchObject({
      code,
      status,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  }
});
it('rejects missing or wrong identity, size and type headers before accepting bytes', async () => {
  for (const patch of [
    { 'Content-Length': '57800001' },
    { 'Content-Length': '0' },
    { 'Content-Length': '123x' },
    { 'X-Content-SHA256': 'b'.repeat(64) },
    { 'X-Canonical-Audio-SHA256': 'b'.repeat(64) },
    { 'X-Source-Video-Id': 'AAAAAAAAAAA' },
    { 'X-Audio-Contract': 'audio/2' },
    { 'Content-Type': 'audio/mpeg' },
  ]) {
    use(new Response(wav, { headers: { ...headers, ...patch } }));
    await expect(loadCanonicalAudio(record)).rejects.toMatchObject({
      code: 'integrity_failed',
    });
  }
  const h = { ...headers } as Record<string, string>;
  delete h['Content-Length'];
  use(new Response(wav, { headers: h }));
  await expect(loadCanonicalAudio(record)).rejects.toMatchObject({
    code: 'integrity_failed',
  });
});
it('full body SHA must match even if pin and manifest headers agree', async () => {
  const bad = wav.slice(0);
  new Uint8Array(bad)[60] = 1;
  use(new Response(bad, { headers }));
  await expect(loadCanonicalAudio(record)).rejects.toMatchObject({
    code: 'integrity_failed',
  });
});
it('rejects truncated, overflowing and header-success body transport failures without returning partial bytes', async () => {
  for (const body of [wav.slice(0, 100), new Uint8Array(wav.byteLength + 1)]) {
    use(new Response(body, { headers }));
    await expect(loadCanonicalAudio(record)).rejects.toMatchObject({
      code: 'integrity_failed',
    });
  }
  use(
    new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(44));
          c.error(Error('KV chunk unavailable'));
        },
      }),
      { headers },
    ),
  );
  await expect(loadCanonicalAudio(record)).rejects.toMatchObject({
    code: 'network_error',
    stage: 'response',
    status: 200,
  });
});
it('WAV format and canonical frames/sampleRate are checked after full SHA', async () => {
  use(new Response(wav, { headers }));
  await expect(
    loadCanonicalAudio({ ...record, frames: 48001 }),
  ).rejects.toMatchObject({ code: 'integrity_failed' });
  const bad = wav.slice(0);
  new Uint8Array(bad)[0] = 0;
  const badsha = await hash(bad);
  use(
    new Response(bad, {
      headers: {
        ...headers,
        'X-Content-SHA256': badsha,
        'X-Canonical-Audio-SHA256': badsha,
      },
    }),
  );
  await expect(
    loadCanonicalAudio({ ...record, audioSha256: badsha }),
  ).rejects.toMatchObject({ code: 'integrity_failed' });
});
it('aborted request and network failure stay truthful and never retry', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(loadCanonicalAudio(record, controller.signal)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('Network');
    }),
  );
  await expect(loadCanonicalAudio(record)).rejects.toMatchObject({
    code: 'network_error',
    stage: 'service',
  });
});

it('retained local source uses exact stable SHA route and never shares a canonical-route response', async () => {
  const fetch = vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(wav, { headers }),
  );
  vi.stubGlobal('fetch', fetch);
  const [canonical, retained] = await Promise.all([
    loadCanonicalAudio(record),
    loadRetainedAudio(record),
  ]);
  expect(canonical).toEqual(wav);
  expect(retained).toEqual(wav);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.map((c) => c[0])).toEqual(
    expect.arrayContaining([
      expect.stringContaining('/v1/chart-sources/1-xGerv5FOk/audio'),
      expect.stringContaining(`/v1/audio-sources/1-xGerv5FOk/${sha}/audio`),
    ]),
  );
});
