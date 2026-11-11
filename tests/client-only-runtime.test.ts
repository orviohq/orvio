import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  admitClientOnlyNetwork,
  ClientOnlyUnavailableError,
  CLIENT_ONLY_UNAVAILABLE,
  loadCachedLocalSource,
  rejectRemoteOnly,
  unavailableRemoteOnly,
  type CachedLocalSourceIdentity,
  type LocalReadDeps,
} from '../src/client-only-runtime';
import { chartSetHash, type SourceRecord } from '../src/external-source';

const enc = new TextEncoder();
const KEYS = ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'] as const;

async function sha256(bytes: Uint8Array): Promise<string> {
  const owned = Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest('SHA-256', owned);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

async function fixture() {
  const audioBytes = enc.encode('cached-local-audio-bytes');
  const audio = audioBytes.slice().buffer as ArrayBuffer;
  const record = {
    version: 1,
    videoId: 'uXn-zOt68V8',
    audioSha256: await sha256(audioBytes),
    sampleRate: 48000,
    estimatedBpm: 144,
    frames: 96000,
    pipelineVersion: 'v1',
    analyzerVersion: 'v1',
    config: '{}',
    charts: {},
  } as any as SourceRecord;
  for (const key of KEYS) {
    const notes = [{ id: 0, time: 1, lane: 0 }];
    record.charts[key] = {
      notes,
      sha256: await sha256(enc.encode(JSON.stringify(notes))),
    };
  }
  record.chartSetSha256 = await chartSetHash(record);
  const identity: CachedLocalSourceIdentity = {
    videoId: record.videoId,
    audioSha256: record.audioSha256,
    chartSetSha256: record.chartSetSha256,
    recordSha256: await sha256(enc.encode(JSON.stringify(record))),
  };
  return { record, identity, audio };
}

function deps(
  record: SourceRecord | null,
  audio: ArrayBuffer | null,
): LocalReadDeps {
  return {
    readRecord: vi.fn(async () => record),
    readAudio: vi.fn(async () => audio),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('client-only network admission', () => {
  const origin = 'https://orvio.example';

  it('allows only explicit same-origin static assets and root documents', () => {
    for (const url of [
      '/',
      '/index.html',
      '/_astro/app.js',
      '/assets/app.css',
      '/icons/icon.svg',
      '/sw.js',
      '/manifest.webmanifest',
    ])
      expect(
        admitClientOnlyNetwork({ origin, url, method: 'GET' }),
      ).toMatchObject({ allowed: true, kind: 'same-origin-static' });
  });

  it('denies runtime APIs including versioned namespaces and arbitrary routes', () => {
    for (const [url, kind] of [
      ['/v1/chart-sources/uXn-zOt68V8', 'runtime-api'],
      ['/v2/unknown-runtime', 'runtime-api'],
      ['/api/import', 'runtime-api'],
      ['/play/uXn-zOt68V8', 'non-static-path'],
      ['/download', 'non-static-path'],
    ] as const)
      expect(
        admitClientOnlyNetwork({ origin, url, method: 'GET' }),
      ).toMatchObject({ allowed: false, kind });
  });

  it('denies cross-origin calls and non-read methods', () => {
    expect(
      admitClientOnlyNetwork({
        origin,
        url: 'https://orvio-share.pn-26f.workers.dev/v1/replays',
      }),
    ).toMatchObject({ allowed: false, kind: 'cross-origin' });
    expect(
      admitClientOnlyNetwork({ origin, url: '/_astro/app.js', method: 'POST' }),
    ).toMatchObject({ allowed: false, kind: 'unsupported-method' });
  });

  it('returns a safe unavailable state for remote-only services', () => {
    expect(unavailableRemoteOnly('canonical-refresh')).toEqual({
      available: false,
      code: CLIENT_ONLY_UNAVAILABLE,
      capability: 'canonical-refresh',
    });
    expect(() => rejectRemoteOnly('share-upload')).toThrow(
      ClientOnlyUnavailableError,
    );
  });
});

describe('loadCachedLocalSource', () => {
  it('loads an old cached song without network when fetch throws', async () => {
    const { record, identity, audio } = await fixture();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('network disabled');
      }),
    );
    const readers = deps(record, audio);
    const result = await loadCachedLocalSource(identity, readers);
    expect(result.state).toBe('ready');
    if (result.state !== 'ready') return;
    expect(result.ids).toEqual({
      videoId: identity.videoId,
      audioSha256: identity.audioSha256,
      chartSetSha256: identity.chartSetSha256,
    });
    expect(result.record).toBe(record);
    expect(fetch).not.toHaveBeenCalled();
    expect(readers.readRecord).toHaveBeenCalledWith(identity, undefined);
  });

  it('reports missing local audio as an explicit file need, not a new identity', async () => {
    const { record, identity } = await fixture();
    const result = await loadCachedLocalSource(identity, deps(record, null));
    expect(result).toMatchObject({ state: 'missing-audio', needsFile: true });
    if (result.state !== 'missing-audio') return;
    expect(result.record.videoId).toBe(identity.videoId);
    expect(result.identity).toBe(identity);
  });

  it('rejects corrupted chart hashes and cached record digests', async () => {
    const { record, identity } = await fixture();
    const badChart = structuredClone(record);
    badChart.charts['5:low']!.sha256 = 'c'.repeat(64);
    expect(
      await loadCachedLocalSource(
        {
          ...identity,
          recordSha256: await sha256(enc.encode(JSON.stringify(badChart))),
        },
        deps(badChart, new ArrayBuffer(0)),
      ),
    ).toMatchObject({ state: 'corrupt', reason: 'record' });
    expect(
      await loadCachedLocalSource(
        { ...identity, recordSha256: 'd'.repeat(64) },
        deps(record, new ArrayBuffer(0)),
      ),
    ).toMatchObject({ state: 'corrupt', reason: 'record' });
  });

  it('rejects corrupted audio bytes', async () => {
    const { record, identity } = await fixture();
    const tampered = enc.encode('tampered').slice().buffer as ArrayBuffer;
    expect(
      await loadCachedLocalSource(identity, deps(record, tampered)),
    ).toMatchObject({ state: 'corrupt', reason: 'audio' });
  });

  it('is abort-safe and mutates no cached identity or record', async () => {
    const { record, identity, audio } = await fixture();
    Object.freeze(identity);
    const before = JSON.stringify(record);
    const controller = new AbortController();
    controller.abort();
    const readers = deps(record, audio);
    const result = await loadCachedLocalSource(
      identity,
      readers,
      controller.signal,
    );
    expect(result.state).toBe('aborted');
    expect(readers.readRecord).not.toHaveBeenCalled();
    expect(JSON.stringify(record)).toBe(before);
    expect(Object.isFrozen(identity)).toBe(true);
  });

  it('treats an abort raised by a local reader as aborted', async () => {
    const { record, identity } = await fixture();
    const controller = new AbortController();
    const readers: LocalReadDeps = {
      readRecord: vi.fn(async () => record),
      readAudio: vi.fn(async () => {
        controller.abort();
        throw new DOMException('Aborted', 'AbortError');
      }),
    };
    expect(
      await loadCachedLocalSource(identity, readers, controller.signal),
    ).toMatchObject({ state: 'aborted' });
  });

  it('never fabricates a YouTube id for a local-file identity', async () => {
    const { record, identity } = await fixture();
    const readers = deps(record, new ArrayBuffer(0));
    expect(
      await loadCachedLocalSource(
        { ...identity, videoId: 'local-file-id' },
        readers,
      ),
    ).toMatchObject({ state: 'corrupt', reason: 'identity' });
    expect(readers.readRecord).not.toHaveBeenCalled();
  });
});
