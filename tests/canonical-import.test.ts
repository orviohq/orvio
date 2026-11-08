import { it, expect, vi, afterEach } from 'vitest';
vi.mock('../src/canonical-library', () => ({ refreshCanonical: vi.fn() }));
vi.mock('../src/external-local', () => ({ localAudio: vi.fn() }));
vi.mock('../src/canonical-audio-api', () => ({ loadCanonicalAudio: vi.fn() }));
vi.mock('../src/external-audio-api', async (original) => ({
  ...(await original<typeof import('../src/external-audio-api')>()),
  createAudioJob: vi.fn(),
  readAudioJob: vi.fn(),
}));
vi.mock('../src/external-source-flow', () => ({ prepareExternalJob: vi.fn() }));
import { importYoutube } from '../src/external-import';
import { refreshCanonical } from '../src/canonical-library';
import { localAudio } from '../src/external-local';
import { loadCanonicalAudio } from '../src/canonical-audio-api';
import {
  createAudioJob,
  readAudioJob,
  AudioJobError,
} from '../src/external-audio-api';
import { prepareExternalJob } from '../src/external-source-flow';
import type { SourceRecord } from '../src/external-source';
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
