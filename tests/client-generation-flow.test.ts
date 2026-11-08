import { it, expect, vi, beforeEach } from 'vitest';
vi.mock('../src/external-audio-api', async (o) => ({
  ...(await o<any>()),
  readAudioJob: vi.fn(),
  loadAudio: vi.fn(),
}));
vi.mock('../src/canonical-library', () => ({ refreshCanonical: vi.fn() }));
vi.mock('../src/local-generated-library', () => ({
  savedLocalGenerated: vi.fn(),
  rememberLocalGenerated: vi.fn(),
  recordDigest: vi.fn(),
}));
vi.mock('../src/local-chart-worker-client', () => ({
  prepareLocalChartOwned: vi.fn(),
}));
vi.mock('../src/canonical-audio-api', () => ({ loadCanonicalAudio: vi.fn() }));
vi.mock('../src/external-local', () => ({ localAudio: vi.fn() }));
vi.mock('../src/external-source', () => ({
  validSourceRecord: vi.fn(),
  verifyChartHashes: vi.fn(),
}));
vi.mock('../src/canonical-pcm.mjs', () => ({ inspectWav: vi.fn() }));
import type { SourceRecord } from '../src/external-source';
import { prepareClientJob } from '../src/prepare-local-job';
import { readAudioJob, loadAudio } from '../src/external-audio-api';
import { refreshCanonical } from '../src/canonical-library';
import {
  savedLocalGenerated,
  rememberLocalGenerated,
  recordDigest,
} from '../src/local-generated-library';
import { prepareLocalChartOwned } from '../src/local-chart-worker-client';
import { localAudio } from '../src/external-local';
import { validSourceRecord, verifyChartHashes } from '../src/external-source';
import { inspectWav } from '../src/canonical-pcm.mjs';
const bytes = new ArrayBuffer(44),
  record = {
    videoId: 'A69BROWSER1',
    audioSha256: 'a'.repeat(64),
    sampleRate: 44100,
    frames: 100,
  } as SourceRecord,
  job = {
    jobId: 'clientJob',
    status: 'done',
    generationMode: 'client',
    canonical: { status: 'client_generation', audioSha256: record.audioSha256 },
    audio: { sha256: record.audioSha256 },
  },
  signal = () => new AbortController().signal;
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readAudioJob).mockResolvedValue(job as any);
  vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
  vi.mocked(localAudio).mockResolvedValue(null);
  vi.mocked(savedLocalGenerated).mockResolvedValue(null);
  vi.mocked(loadAudio).mockResolvedValue(bytes);
  vi.mocked(prepareLocalChartOwned).mockResolvedValue({
    bytes,
    record,
    baseRecordSha256: 'digest',
  });
  vi.mocked(recordDigest).mockResolvedValue('digest');
  vi.mocked(validSourceRecord).mockReturnValue(true);
  vi.mocked(verifyChartHashes).mockResolvedValue(true);
  vi.mocked(inspectWav).mockReturnValue({
    sampleRate: 44100,
    frames: 100,
  } as any);
});
it('POST client echo cannot switch an actual existing server job', async () => {
  vi.mocked(readAudioJob).mockResolvedValue({
    ...job,
    generationMode: 'server',
    canonical: { status: 'published' },
  } as any);
  expect(
    await prepareClientJob(record.videoId, job.jobId, signal()),
  ).toBeNull();
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(loadAudio).not.toHaveBeenCalled();
});
it('existing trusted canonical wins even when actual GET advertises client mode', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({
    state: 'ready',
    record,
  } as any);
  vi.mocked(localAudio).mockResolvedValue({ bytes } as any);
  expect(
    (await prepareClientJob(record.videoId, job.jobId, signal()))?.record,
  ).toBe(record);
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
});
it('stored local immutable identity reuses matching verified audio without a worker', async () => {
  vi.mocked(savedLocalGenerated).mockResolvedValue(record as any);
  vi.mocked(localAudio).mockResolvedValue({ bytes } as any);
  expect(
    (await prepareClientJob(record.videoId, job.jobId, signal()))?.bytes,
  ).toBe(bytes);
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(loadAudio).not.toHaveBeenCalled();
});
it('mismatched retained identity never regenerates an old local pin', async () => {
  vi.mocked(savedLocalGenerated).mockResolvedValue({
    ...record,
    audioSha256: 'b'.repeat(64),
  } as any);
  await expect(
    prepareClientJob(record.videoId, job.jobId, signal()),
  ).rejects.toMatchObject({ code: 'source_changed' });
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
});
it('new verified current worker output gets only explicit local provenance', async () => {
  const result = await prepareClientJob(record.videoId, job.jobId, signal());
  expect(result?.record.sourceProvenance).toBe('local-current35-v1');
  expect(prepareLocalChartOwned).toHaveBeenCalledWith({
    bytes,
    videoId: record.videoId,
    audioSha256: record.audioSha256,
    signal: expect.any(AbortSignal),
  });
  expect(rememberLocalGenerated).toHaveBeenCalledWith(
    result?.record,
    'digest',
    expect.any(AbortSignal),
  );
});
it('invalid whole-record or chart digest rejects before any local publication', async () => {
  vi.mocked(verifyChartHashes).mockResolvedValue(false);
  await expect(
    prepareClientJob(record.videoId, job.jobId, signal()),
  ).rejects.toMatchObject({ code: 'integrity_failed' });
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
});
it('cancellation after detached worker return prevents local publication', async () => {
  const c = new AbortController();
  vi.mocked(prepareLocalChartOwned).mockImplementation(async () => {
    c.abort();
    return { bytes, record, baseRecordSha256: 'digest' };
  });
  await expect(
    prepareClientJob(record.videoId, job.jobId, c.signal),
  ).rejects.toBeDefined();
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
});
it('a corrupt download never starts a worker or saves a pin', async () => {
  vi.mocked(loadAudio).mockRejectedValue(Error('corrupt'));
  await expect(
    prepareClientJob(record.videoId, job.jobId, signal()),
  ).rejects.toBeDefined();
  expect(prepareLocalChartOwned).not.toHaveBeenCalled();
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
});

it('abort during asynchronous post-worker chart validation cannot publish a pin', async () => {
  const c = new AbortController();
  vi.mocked(verifyChartHashes).mockImplementation(async () => {
    c.abort();
    return true;
  });
  await expect(
    prepareClientJob(record.videoId, job.jobId, c.signal),
  ).rejects.toBeDefined();
  expect(rememberLocalGenerated).not.toHaveBeenCalled();
});
