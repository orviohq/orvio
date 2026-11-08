vi.mock('../src/local-generated-library', () => ({
  savedLocalGenerated: vi.fn(),
}));
import { it, expect, vi, afterEach, beforeEach } from 'vitest';
vi.mock('../src/canonical-library', () => ({ refreshCanonical: vi.fn() }));
vi.mock('../src/external-local', () => ({
  localAudio: vi.fn(),
  localMetadata: vi.fn(),
  saveLocalAudio: vi.fn(),
}));
vi.mock('../src/canonical-audio-api', () => ({
  loadCanonicalAudio: vi.fn(),
  loadRetainedAudio: vi.fn(),
}));
vi.mock('../src/external-audio-api', async (original) => ({
  ...(await original<typeof import('../src/external-audio-api')>()),
  createAudioJob: vi.fn(),
  readAudioJob: vi.fn(),
}));
vi.mock('../src/external-source-flow', () => ({ prepareExternalJob: vi.fn() }));
import { importYoutube } from '../src/external-import';
import { refreshCanonical } from '../src/canonical-library';
import { localAudio } from '../src/external-local';
import {
  loadCanonicalAudio,
  loadRetainedAudio,
} from '../src/canonical-audio-api';
import { savedLocalGenerated } from '../src/local-generated-library';
import { saveLocalAudio, localMetadata } from '../src/external-local';
import {
  createAudioJob,
  readAudioJob,
  AudioJobError,
} from '../src/external-audio-api';
import { prepareExternalJob } from '../src/external-source-flow';
import type { SourceRecord } from '../src/external-source';
import { queryClient } from '../src/query-client';
beforeEach(() => queryClient.clear());
const record = {
  videoId: '1-xGerv5FOk',
  audioSha256: 'a'.repeat(64),
} as SourceRecord;
const ready = {
  state: 'ready' as const,
  record,
  recordSha256: 'b'.repeat(64),
  audioCached: true,
};
const bytes = new ArrayBuffer(44);
afterEach(() => vi.resetAllMocks());
it('uses matching local canonical WAV before any retained GET or extraction', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue(ready);
  vi.mocked(localAudio).mockResolvedValue({
    key: 'fixture',
    title: 'Saved',
    bytes,
  });
  const result = await importYoutube(
    record.videoId,
    new AbortController().signal,
  );
  expect(result.prepared.bytes).toBe(bytes);
  expect(loadCanonicalAudio).not.toHaveBeenCalled();
  expect(createAudioJob).not.toHaveBeenCalled();
  expect(readAudioJob).not.toHaveBeenCalled();
});
it('ready canonical uses stable verified WAV GET without job identity or a new extraction even with obsolete job option', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue(ready);
  vi.mocked(localAudio).mockResolvedValue(null);
  vi.mocked(loadCanonicalAudio).mockResolvedValue(bytes);
  const result = await importYoutube(
    record.videoId,
    new AbortController().signal,
    { jobId: 'expired-job' },
  );
  expect(result.prepared).toEqual({ record, bytes, restored: true });
  expect(result.jobId).toBeUndefined();
  expect(loadCanonicalAudio).toHaveBeenCalledTimes(1);
  expect(createAudioJob).not.toHaveBeenCalled();
  expect(readAudioJob).not.toHaveBeenCalled();
});
it('missing retained bytes/service/integrity failure never fall through to extraction', async () => {
  for (const code of [
    'audio_expired',
    'network_error',
    'integrity_failed',
  ] as const) {
    vi.mocked(refreshCanonical).mockResolvedValue(ready);
    vi.mocked(localAudio).mockResolvedValue(null);
    vi.mocked(loadCanonicalAudio).mockRejectedValue(new AudioJobError(code));
    await expect(
      importYoutube(record.videoId, new AbortController().signal),
    ).rejects.toMatchObject({ code });
    expect(createAudioJob).not.toHaveBeenCalled();
    expect(readAudioJob).not.toHaveBeenCalled();
  }
});
it('an explicit add of a truly missing canonical still creates exactly one normal job', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
  vi.mocked(createAudioJob).mockResolvedValue({
    jobId: 'new-job',
    status: 'done',
  });
  vi.mocked(readAudioJob).mockResolvedValue({
    jobId: 'new-job',
    status: 'done',
  });
  vi.mocked(prepareExternalJob).mockResolvedValue({
    record,
    bytes,
    restored: false,
  });
  const result = await importYoutube(
    record.videoId,
    new AbortController().signal,
  );
  expect(result.jobId).toBe('new-job');
  expect(createAudioJob).toHaveBeenCalledTimes(1);
  expect(loadCanonicalAudio).not.toHaveBeenCalled();
});

for (const state of ['pending', 'replicating', 'deferred'] as const)
  it(`${state} existing canonical preparation never creates or reads an extraction job`, async () => {
    vi.mocked(refreshCanonical).mockResolvedValue({ state, retryAfterSec: 15 });
    await expect(
      importYoutube(record.videoId, new AbortController().signal, {
        jobId: 'old-job',
      }),
    ).rejects.toMatchObject({ code: 'request_timeout', retryAfterSec: 15 });
    expect(refreshCanonical).toHaveBeenCalledTimes(1);
    expect(createAudioJob).not.toHaveBeenCalled();
    expect(readAudioJob).not.toHaveBeenCalled();
    expect(loadCanonicalAudio).not.toHaveBeenCalled();
  });

it('only an explicit re-add replaces a confirmed terminal unavailable job, exactly once', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
  vi.mocked(readAudioJob).mockResolvedValue({
    jobId: 'old-job',
    status: 'error',
    error: { code: 'unavailable' },
  });
  vi.mocked(createAudioJob).mockResolvedValue({
    jobId: 'new-job',
    status: 'error',
    error: { code: 'unavailable' },
  });
  await expect(
    importYoutube(record.videoId, new AbortController().signal, {
      jobId: 'old-job',
      retryFailed: true,
    }),
  ).rejects.toMatchObject({ code: 'unavailable' });
  expect(readAudioJob).toHaveBeenCalledTimes(1);
  expect(createAudioJob).toHaveBeenCalledTimes(1);
});
it('automatic known-job resume never replaces terminal failure', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
  vi.mocked(readAudioJob).mockResolvedValue({
    jobId: 'old-job',
    status: 'error',
    error: { code: 'unavailable' },
  });
  await expect(
    importYoutube(record.videoId, new AbortController().signal, {
      jobId: 'old-job',
    }),
  ).rejects.toMatchObject({ code: 'unavailable' });
  expect(createAudioJob).not.toHaveBeenCalled();
});
it('an uncertain old job GET failure never becomes a replacement extraction', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
  vi.mocked(readAudioJob).mockRejectedValue(new AudioJobError('network_error'));
  await expect(
    importYoutube(record.videoId, new AbortController().signal, {
      jobId: 'old-job',
      retryFailed: true,
    }),
  ).rejects.toMatchObject({ code: 'network_error' });
  expect(createAudioJob).not.toHaveBeenCalled();
});
it('an explicit re-add never replaces a known completed job', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
  vi.mocked(readAudioJob).mockResolvedValue({
    jobId: 'old-job',
    status: 'done',
  });
  vi.mocked(readAudioJob).mockResolvedValue({
    jobId: 'new-job',
    status: 'done',
  });
  vi.mocked(prepareExternalJob).mockResolvedValue({
    record,
    bytes,
    restored: false,
  });
  await importYoutube(record.videoId, new AbortController().signal, {
    jobId: 'old-job',
    retryFailed: true,
  });
  expect(createAudioJob).not.toHaveBeenCalled();
});
for (const code of [
  'rate_limited',
  'region_blocked',
  'too_long',
  'source_changed',
  'integrity_failed',
] as const)
  it(`manual re-add does not turn ${code} into a new extraction`, async () => {
    vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
    vi.mocked(readAudioJob).mockResolvedValue({
      jobId: 'old-job',
      status: 'error',
      error: { code },
    });
    await expect(
      importYoutube(record.videoId, new AbortController().signal, {
        jobId: 'old-job',
        retryFailed: true,
      }),
    ).rejects.toMatchObject({ code });
    expect(createAudioJob).not.toHaveBeenCalled();
  });

it('known local identity with evicted audio uses exact retained SHA GET before any POST, not a replacement extraction', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
  vi.mocked(savedLocalGenerated).mockResolvedValue(record);
  vi.mocked(localAudio).mockResolvedValue(null);
  vi.mocked(localMetadata).mockResolvedValue({
    title: 'Preserved chart',
    jobId: 'expired-job',
  } as any);
  vi.mocked(loadRetainedAudio).mockResolvedValue(bytes);
  const result = await importYoutube(
    record.videoId,
    new AbortController().signal,
  );
  expect(result.prepared.record).toBe(record);
  expect(result.prepared.bytes).toBe(bytes);
  expect(loadRetainedAudio).toHaveBeenCalledWith(
    record,
    expect.any(AbortSignal),
  );
  expect(saveLocalAudio).toHaveBeenCalled();
  expect(createAudioJob).not.toHaveBeenCalled();
  expect(readAudioJob).not.toHaveBeenCalled();
  expect(prepareExternalJob).not.toHaveBeenCalled();
});
it('known local SHA mismatch or retained outage does not re-extract or regenerate', async () => {
  for (const code of [
    'source_changed',
    'integrity_failed',
    'network_error',
  ] as const) {
    vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
    vi.mocked(savedLocalGenerated).mockResolvedValue(record);
    vi.mocked(localAudio).mockResolvedValue(null);
    vi.mocked(localMetadata).mockResolvedValue(null);
    vi.mocked(loadRetainedAudio).mockRejectedValue(new AudioJobError(code));
    await expect(
      importYoutube(record.videoId, new AbortController().signal),
    ).rejects.toMatchObject({ code });
    expect(createAudioJob).not.toHaveBeenCalled();
    expect(saveLocalAudio).not.toHaveBeenCalled();
  }
});
