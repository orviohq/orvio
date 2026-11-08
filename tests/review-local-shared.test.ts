import { it, expect, vi, afterEach } from 'vitest';
import { readSharedAudio } from '../src/external-share-audio';
import type { ExternalSong } from '../src/external-catalog';
const store = vi.hoisted(() => ({
  local: vi.fn(async () => null),
  save: vi.fn(async () => {}),
}));
vi.mock('../src/external-local', () => ({
  localAudio: store.local,
  saveLocalAudio: store.save,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
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
const sha = Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', wav)),
  (x) => x.toString(16).padStart(2, '0'),
).join('');
function source() {
  return {
    song: { title: 'Frozen replay' },
    record: {
      videoId: 'AAAAAAAAAAA',
      audioSha256: sha,
      frames: 48000,
      sampleRate: 48000,
      charts: { frozen: 'never replaced' },
    },
    jobId: 'expired-job',
  } as unknown as ExternalSong;
}
const headers = {
  'Content-Type': 'audio/wav',
  'Content-Length': String(wav.byteLength),
  'X-Content-SHA256': sha,
  'X-Canonical-Audio-SHA256': sha,
  'X-Source-Video-Id': 'AAAAAAAAAAA',
  'X-Audio-Contract': 'audio/1',
};
it('cold shared replay uses exactly one stable audio GET, verifies full body, saves before return, and warm memory uses no GET', async () => {
  const item = source(),
    original = structuredClone(item.record);
  let saved = false;
  store.save.mockImplementationOnce(async () => {
    saved = true;
  });
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    expect(url).toBe(
      'https://orvio-share.pn-26f.workers.dev/v1/chart-sources/AAAAAAAAAAA/audio',
    );
    expect(init?.method).toBeUndefined();
    return new Response(wav, { headers });
  });
  vi.stubGlobal('fetch', fetch);
  expect(await readSharedAudio(item)).toEqual(wav);
  expect(saved).toBe(true);
  expect(item.record).toEqual(original);
  expect(item.jobId).toBe('expired-job');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await readSharedAudio(item)).toBe(item.bytes);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('valid-looking headers cannot admit changed body or mismatched frozen sample frames', async () => {
  for (const change of ['body', 'frames']) {
    const item = source();
    const original = structuredClone(item.record);
    const body = wav.slice(0);
    if (change === 'body') new Uint8Array(body)[100] = 1;
    else item.record.frames++;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { headers })),
    );
    await expect(readSharedAudio(item)).rejects.toMatchObject({
      code: 'integrity_failed',
    });
    expect(item.bytes).toBeUndefined();
    expect(store.save).not.toHaveBeenCalled();
    expect(item.record.charts).toEqual(original.charts);
  }
});
it('aborted or partial stable response never becomes playable or saved', async () => {
  for (const mode of ['abort', 'partial']) {
    const item = source();
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (mode === 'abort')
          controller.abort(new DOMException('Aborted', 'AbortError'));
        return new Response(
          wav.slice(0, mode === 'partial' ? 100 : wav.byteLength),
          { headers },
        );
      }),
    );
    await expect(
      readSharedAudio(item, controller.signal),
    ).rejects.toBeDefined();
    expect(item.bytes).toBeUndefined();
    expect(store.save).not.toHaveBeenCalled();
  }
});

it('missing, pending, deferred and changed pin reject through the stable route without a chart lookup or persistence', async () => {
  for (const [status, error, code] of [
    [404, 'chart_source_not_found', 'not_found'],
    [202, 'chart_source_pending', 'request_timeout'],
    [202, 'chart_source_deferred', 'request_timeout'],
    [409, 'audio_changed', 'source_changed'],
    [410, 'audio_expired', 'audio_expired'],
  ] as const) {
    const item = source(),
      original = structuredClone(item.record);
    const fetch = vi.fn(async (url: string) => {
      expect(url.endsWith('/audio')).toBe(true);
      return new Response(JSON.stringify({ error, retryAfterSec: 3 }), {
        status,
      });
    });
    vi.stubGlobal('fetch', fetch);
    await expect(readSharedAudio(item)).rejects.toMatchObject({ code });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(item.record).toEqual(original);
    expect(item.bytes).toBeUndefined();
    expect(store.save).not.toHaveBeenCalled();
  }
});
it('same audio pin with unrelated newer chart metadata never replaces frozen replay chart', async () => {
  const item = source(),
    original = structuredClone(item.record);
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(wav, {
          headers: {
            ...headers,
            'X-ChartSet-SHA256': 'b'.repeat(64),
            'X-SourceRecord-SHA256': 'c'.repeat(64),
          },
        }),
    ),
  );
  await readSharedAudio(item);
  expect(item.record).toEqual(original);
});
it('REVIEW fresh-device local share uses exact SHA retained GET and preserves chart', async () => {
  const item = source();
  item.record.sourceProvenance = 'local-current35-v1';
  const frozen = structuredClone(item.record);
  const fetch = vi.fn(async (url: string) => {
    expect(url).toBe(
      'https://orvio-share.pn-26f.workers.dev/v1/audio-sources/AAAAAAAAAAA/' +
        sha +
        '/audio',
    );
    return new Response(wav, { headers });
  });
  vi.stubGlobal('fetch', fetch);
  expect(await readSharedAudio(item)).toEqual(wav);
  expect(item.record).toEqual(frozen);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(store.save).toHaveBeenCalledTimes(1);
});
