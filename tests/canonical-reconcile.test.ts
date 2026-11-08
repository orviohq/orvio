import { it, expect, vi, afterEach } from 'vitest';
import type { SourceRecord } from '../src/external-source';
vi.mock('../src/canonical-library', () => ({
  refreshCanonical: vi.fn(),
  savedCanonical: vi.fn(),
}));
vi.mock('../src/external-local', () => ({
  localAudio: vi.fn(),
  localMetadata: vi.fn(),
}));
vi.mock('../src/canonical-job', () => ({ canonicalForJob: vi.fn() }));
import { refreshCanonical } from '../src/canonical-library';
import { localAudio } from '../src/external-local';
import { canonicalForJob } from '../src/canonical-job';
import { reconcileCanonical } from '../src/canonical-reconcile';
const row = {
  videoId: 'E2EFIXTURE1',
  title: 'Fixture',
  archiveId: 'archive',
  state: 'loading' as const,
};
const record = {
  videoId: row.videoId,
  audioSha256: 'a'.repeat(64),
} as SourceRecord;
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
for (const jobId of [undefined, 'expired-job'])
  it(`waits trusted server repair with ${jobId ?? 'no job'} without old job GET or POST`, async () => {
    vi.useFakeTimers();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.mocked(refreshCanonical)
      .mockResolvedValueOnce({ state: 'pending', retryAfterSec: 1 })
      .mockResolvedValueOnce({ state: 'replicating', retryAfterSec: 1 })
      .mockResolvedValue({
        state: 'ready',
        record,
        recordSha256: 'b'.repeat(64),
        audioCached: true,
      });
    vi.mocked(localAudio).mockResolvedValue({
      key: 'fixture',
      bytes: new ArrayBuffer(12),
      title: 'Fixture',
      jobId: '',
    } as Awaited<ReturnType<typeof localAudio>>);
    const pending = reconcileCanonical(
      { ...row, jobId },
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(2000);
    expect((await pending).record).toBe(record);
    expect(refreshCanonical).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
    expect(canonicalForJob).not.toHaveBeenCalled();
  });
it('missing no-job cache fails explicitly and never silently extracts', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({ state: 'missing' });
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(
    reconcileCanonical(row, new AbortController().signal),
  ).rejects.toMatchObject({ code: 'audio_expired' });
  expect(fetch).not.toHaveBeenCalled();
  expect(canonicalForJob).not.toHaveBeenCalled();
});
it('deferred repair returns the declared retry delay without looping or old-job lookup', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({
    state: 'deferred',
    retryAfterSec: 60,
  });
  await expect(
    reconcileCanonical(
      { ...row, jobId: 'expired-job' },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code: 'request_timeout', retryAfterSec: 60 });
  expect(refreshCanonical).toHaveBeenCalledTimes(1);
});
it('ready canonical without local audio or job needs source, never silently uploads or extracts', async () => {
  vi.mocked(refreshCanonical).mockResolvedValue({
    state: 'ready',
    record,
    recordSha256: 'b'.repeat(64),
    audioCached: true,
  });
  vi.mocked(localAudio).mockResolvedValue(null);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(
    reconcileCanonical(row, new AbortController().signal),
  ).rejects.toMatchObject({ code: 'audio_expired' });
  expect(fetch).not.toHaveBeenCalled();
});
it('pending repair stops on abort without further GET or old-job lookup', async () => {
  vi.useFakeTimers();
  vi.mocked(refreshCanonical).mockResolvedValue({
    state: 'pending',
    retryAfterSec: 3,
  });
  const controller = new AbortController();
  const pending = reconcileCanonical(row, controller.signal);
  const check = expect(pending).rejects.toThrow('cancel repair');
  await vi.advanceTimersByTimeAsync(0);
  controller.abort(new Error('cancel repair'));
  await check;
  await vi.advanceTimersByTimeAsync(3000);
  expect(refreshCanonical).toHaveBeenCalledTimes(1);
});
it('deferred after pending does not fall through to an expired job', async () => {
  vi.useFakeTimers();
  vi.mocked(refreshCanonical)
    .mockResolvedValueOnce({ state: 'pending', retryAfterSec: 1 })
    .mockResolvedValue({ state: 'deferred', retryAfterSec: 20 });
  const pending = reconcileCanonical(
    { ...row, jobId: 'expired' },
    new AbortController().signal,
  );
  const check = expect(pending).rejects.toMatchObject({
    code: 'request_timeout',
    retryAfterSec: 20,
  });
  await vi.advanceTimersByTimeAsync(1000);
  await check;
  expect(canonicalForJob).not.toHaveBeenCalled();
});
