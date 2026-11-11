import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { prepareDirectYoutube } from '../src/prepare-direct-youtube';
import {
  acquireYoutubeAudio,
  YoutubeDirectApiError,
} from '../src/youtube-direct-api';
import { prepareLocalChartOwned } from '../src/local-chart-worker-client';
import {
  recordDigest,
  rememberLocalGenerated,
  savedLocalGenerated,
} from '../src/local-generated-library';
import {
  localAudio,
  localMetadata,
  saveLocalAudio,
} from '../src/external-local';
import { listPinnedSources } from '../src/external-source-store';
import { chartSetHash, type SourceRecord } from '../src/external-source';
import { sha256 } from '../src/opus/opus-descriptor.mjs';
import { AudioJobError } from '../src/external-audio-api';
import { externalError } from '../src/external-errors';
import { readDirectYoutubeMetadata } from '../src/youtube-direct-metadata';
vi.mock('../src/youtube-direct-metadata', () => ({
  readDirectYoutubeMetadata: vi.fn(),
}));

vi.mock('../src/youtube-direct-api', async (original) => ({
  ...(await original<typeof import('../src/youtube-direct-api')>()),
  acquireYoutubeAudio: vi.fn(),
}));
vi.mock('../src/local-chart-worker-client', () => ({
  prepareLocalChartOwned: vi.fn(),
}));
vi.mock('../src/local-generated-library', async (original) => ({
  ...(await original<typeof import('../src/local-generated-library')>()),
  rememberLocalGenerated: vi.fn(),
  savedLocalGenerated: vi.fn(),
}));
vi.mock('../src/external-local', () => ({
  localAudio: vi.fn(),
  localMetadata: vi.fn(),
  saveLocalAudio: vi.fn(),
}));
vi.mock('../src/external-source-store', () => ({ listPinnedSources: vi.fn() }));

const videoId = 'uXn-zOt68V8';
it('persists direct title and channel with validated audio', async () => {
  vi.mocked(readDirectYoutubeMetadata).mockResolvedValue({
    title: 'Actual title',
    author: 'Actual channel',
  });
  const result = await prepareDirectYoutube(
    videoId,
    controller.signal,
    options,
  );
  expect(result).toMatchObject({
    title: 'Actual title',
    author: 'Actual channel',
  });
  expect(saveLocalAudio).toHaveBeenCalledWith(
    result.record,
    'Actual title',
    undefined,
    bytes,
    'Actual channel',
  );
});
let record: SourceRecord;
let bytes: ArrayBuffer;
let controller: AbortController;
const options = { publicKey: 'public-test-key' };
beforeEach(async () => {
  vi.resetAllMocks();
  vi.mocked(readDirectYoutubeMetadata).mockResolvedValue(null);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw Error('Unexpected network');
    }),
  );
  controller = new AbortController();
  bytes = new ArrayBuffer(44 + 48000 * 4);
  const v = new DataView(bytes);
  v.setUint32(0, 0x52494646);
  v.setUint32(4, bytes.byteLength - 8, true);
  v.setUint32(8, 0x57415645);
  v.setUint32(12, 0x666d7420);
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, 48000, true);
  v.setUint32(28, 192000, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  v.setUint32(36, 0x64617461);
  v.setUint32(40, bytes.byteLength - 44, true);
  record = {
    version: 1,
    videoId,
    audioSha256: await sha256(new Uint8Array(bytes)),
    sampleRate: 48000,
    frames: 48000,
    estimatedBpm: 120,
    pipelineVersion: 'v1',
    analyzerVersion: 'v1',
    config: '{}',
    charts: {},
  } as SourceRecord;
  for (const key of [
    '5:low',
    '5:mid',
    '5:high',
    '7:low',
    '7:mid',
    '7:high',
  ] as const) {
    const notes = [{ id: 0, time: 0.5, lane: 0 }];
    record.charts[key] = {
      notes,
      sha256: await sha256(new TextEncoder().encode(JSON.stringify(notes))),
    };
  }
  record.chartSetSha256 = await chartSetHash(record);
  vi.mocked(savedLocalGenerated).mockResolvedValue(null);
  vi.mocked(listPinnedSources).mockResolvedValue([]);
  vi.mocked(localAudio).mockResolvedValue(null);
  vi.mocked(localMetadata).mockResolvedValue(null);
  vi.mocked(acquireYoutubeAudio).mockResolvedValue({
    bytes,
    audioSha256: record.audioSha256,
    sampleRate: 48000,
    frames: 48000,
    durationSeconds: 1,
  });
  vi.mocked(prepareLocalChartOwned).mockResolvedValue({
    record,
    bytes,
    baseRecordSha256: await recordDigest(record),
  });
});
afterEach(() => vi.unstubAllGlobals());

it('validates the legacy worker output, pins then saves audio before exposing playback', async () => {
  const result = await prepareDirectYoutube(
    videoId,
    controller.signal,
    options,
  );
  expect(result.record).toEqual({
    ...record,
    sourceProvenance: 'local-current35-v1',
  });
  expect(result.bytes).toBe(bytes);
  expect(prepareLocalChartOwned).toHaveBeenCalledWith({
    bytes,
    videoId,
    audioSha256: record.audioSha256,
    signal: controller.signal,
  });
  expect(rememberLocalGenerated).toHaveBeenCalledWith(
    result.record,
    await recordDigest(result.record as SourceRecord),
    controller.signal,
  );
  expect(saveLocalAudio).toHaveBeenCalledWith(
    result.record,
    'YouTube · ' + videoId,
    undefined,
    bytes,
    undefined,
  );
  expect(
    vi.mocked(rememberLocalGenerated).mock.invocationCallOrder[0],
  ).toBeLessThan(vi.mocked(saveLocalAudio).mock.invocationCallOrder[0]!);
  expect(fetch).not.toHaveBeenCalled();
});

it('reuses a pinned cached source without acquisition or generation', async () => {
  vi.mocked(savedLocalGenerated).mockResolvedValue(record);
  vi.mocked(listPinnedSources).mockResolvedValue([record]);
  vi.mocked(localAudio).mockResolvedValue({
    key: 'cached',
    title: 'Saved',
    bytes,
  });
  expect(
    await prepareDirectYoutube(videoId, controller.signal, options),
  ).toMatchObject({ record, restored: true, title: 'Saved' });
  expect(acquireYoutubeAudio).not.toHaveBeenCalled();
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(saveLocalAudio).not.toHaveBeenCalled();
});

it('refuses changed audio for an existing pin without overwriting device data', async () => {
  vi.mocked(savedLocalGenerated).mockResolvedValue({
    ...record,
    audioSha256: 'a'.repeat(64),
  });
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ code: 'source_changed' });
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
  expect(saveLocalAudio).not.toHaveBeenCalled();
});

it('rejects quota failure instead of returning a playable result', async () => {
  vi.mocked(saveLocalAudio).mockRejectedValue(
    new DOMException('Full', 'QuotaExceededError'),
  );
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ code: 'storage_full', stage: 'storage' });
});

it('rejects cancellation before any work', async () => {
  controller.abort();
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(acquireYoutubeAudio).not.toHaveBeenCalled();
  expect(saveLocalAudio).not.toHaveBeenCalled();
});

it('rejects a corrupt worker chart without publishing', async () => {
  record.charts['5:low']!.sha256 = 'a'.repeat(64);
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ code: 'integrity_failed' });
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
  expect(saveLocalAudio).not.toHaveBeenCalled();
});

it('maps adapter event objects and grants completion budget only after verification', async () => {
  const stages: string[] = [];
  const verified = vi.fn();
  const audio = {
    bytes,
    audioSha256: record.audioSha256,
    sampleRate: 48000,
    frames: 48000,
    durationSeconds: 1,
  };
  vi.mocked(acquireYoutubeAudio).mockImplementation(async (_id, opts) => {
    for (const stage of [
      'request',
      'waiting',
      'downloading',
      'verifying',
    ] as const)
      opts.onStage?.({ stage, attempt: 1 });
    expect(verified).not.toHaveBeenCalled();
    return audio;
  });
  await prepareDirectYoutube(videoId, controller.signal, {
    ...options,
    onStage: (s) => stages.push(s),
    onVerified: verified,
  });
  expect(stages).toEqual([
    'checking',
    'checking',
    'extracting',
    'downloading',
    'downloading',
    'charting',
    'saving',
  ]);
  expect(verified).toHaveBeenCalledTimes(1);
  expect(verified.mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(prepareLocalChartOwned).mock.invocationCallOrder[0]!,
  );
});

it.each([
  ['invalid_video_id', 'invalid_url', 400],
  ['auth', 'unavailable', 403],
  ['rate_limited', 'rate_limited', 429],
  ['unavailable', 'unavailable', 503],
  ['network_error', 'network_error', undefined],
  ['request_timeout', 'request_timeout', undefined],
  ['integrity_failed', 'integrity_failed', undefined],
  ['oversize', 'too_long', undefined],
] as const)(
  'maps adapter %s to the UI error without fallback',
  async (code, expected, status) => {
    vi.mocked(acquireYoutubeAudio).mockRejectedValue(
      new YoutubeDirectApiError(code, status, 7),
    );
    await expect(
      prepareDirectYoutube(videoId, controller.signal, options),
    ).rejects.toMatchObject({
      code: expected,
      status,
      retryAfterSec: 7,
      stage: code === 'integrity_failed' ? 'response' : 'service',
    });
    expect(prepareLocalChartOwned).not.toHaveBeenCalled();
    expect(saveLocalAudio).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  },
);

it('reports a missing browser key as an authentication status', async () => {
  vi.mocked(acquireYoutubeAudio).mockRejectedValue(
    new YoutubeDirectApiError('auth'),
  );
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({
    code: 'unavailable',
    status: 401,
    stage: 'service',
  });
});

it('preserves adapter cancellation', async () => {
  vi.mocked(acquireYoutubeAudio).mockRejectedValue(
    new YoutubeDirectApiError('aborted'),
  );
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(saveLocalAudio).not.toHaveBeenCalled();
});

it('refuses invalid media before worker transfer or publication', async () => {
  new Uint8Array(bytes)[0] = 0;
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ code: 'unsupported_format', stage: 'response' });
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
});

it('refuses an adapter byte/hash mismatch before worker transfer', async () => {
  new Uint8Array(bytes)[50] = 1;
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ code: 'integrity_failed' });
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
});

it.each(['videoId', 'audioSha256', 'frames', 'digest', 'bytes'] as const)(
  'rejects worker %s substitution',
  async (field) => {
    const output = {
      record: structuredClone(record),
      bytes: bytes.slice(0),
      baseRecordSha256: await recordDigest(record),
    };
    if (field === 'videoId') output.record.videoId = 'AAAAAAAAAAA';
    if (field === 'audioSha256') output.record.audioSha256 = 'a'.repeat(64);
    if (field === 'frames') output.record.frames++;
    if (field === 'digest') output.baseRecordSha256 = 'a'.repeat(64);
    if (field === 'bytes') new Uint8Array(output.bytes)[50] = 1;
    vi.mocked(prepareLocalChartOwned).mockResolvedValue(output);
    await expect(
      prepareDirectYoutube(videoId, controller.signal, options),
    ).rejects.toMatchObject({ code: 'integrity_failed' });
    expect(rememberLocalGenerated).not.toHaveBeenCalled();
    expect(saveLocalAudio).not.toHaveBeenCalled();
  },
);

it('keeps an old pin and its metadata when explicitly restoring identical audio', async () => {
  vi.mocked(listPinnedSources).mockResolvedValue([record]);
  vi.mocked(localMetadata).mockResolvedValue({
    key: 'old',
    title: 'Original',
    author: 'Author',
    jobId: 'old-job',
  });
  const result = await prepareDirectYoutube(
    videoId,
    controller.signal,
    options,
  );
  expect(result).toMatchObject({
    record,
    restored: true,
    title: 'Original',
    author: 'Author',
    jobId: 'old-job',
  });
  expect(saveLocalAudio).toHaveBeenCalledWith(
    record,
    'Original',
    'old-job',
    bytes,
    'Author',
  );
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
});

it('does not download when local storage cannot be read', async () => {
  vi.mocked(savedLocalGenerated).mockRejectedValue(Error('IDB unavailable'));
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ code: 'unavailable', stage: 'storage' });
  expect(acquireYoutubeAudio).not.toHaveBeenCalled();
});

it('does not save audio if durable pin publication fails', async () => {
  vi.mocked(rememberLocalGenerated).mockRejectedValue(
    new DOMException('Full', 'QuotaExceededError'),
  );
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ code: 'storage_full', stage: 'storage' });
  expect(saveLocalAudio).not.toHaveBeenCalled();
});

it('stops after worker cancellation without publishing', async () => {
  vi.mocked(prepareLocalChartOwned).mockImplementation(async () => {
    controller.abort();
    return { record, bytes, baseRecordSha256: await recordDigest(record) };
  });
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
  expect(saveLocalAudio).not.toHaveBeenCalled();
});

it('does not expose playback after cancellation during audio storage', async () => {
  vi.mocked(saveLocalAudio).mockImplementation(async () => {
    controller.abort();
  });
  await expect(
    prepareDirectYoutube(videoId, controller.signal, options),
  ).rejects.toMatchObject({ name: 'AbortError' });
});

it('describes local quota failures as browser storage, preserving the server error distinction', () => {
  const local = new AudioJobError(
    'storage_full',
    undefined,
    undefined,
    undefined,
    'storage',
  );
  expect(externalError(local, 'ko')).toContain('브라우저 저장 공간');
  expect(externalError(local, 'ko')).not.toContain('서버');
  expect(externalError(local, 'en')).toContain('browser storage');
  expect(externalError(new AudioJobError('storage_full'), 'ko')).toContain(
    '서버',
  );
});
