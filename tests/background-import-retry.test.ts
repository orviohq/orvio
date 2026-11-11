import { afterEach, expect, it, vi } from 'vitest';
import { BackgroundImports, type YoutubeImportRunner } from '../src/background-imports';
import { AudioJobError } from '../src/external-audio-api';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function store(rows: unknown[] = []) {
  let value = JSON.stringify(rows);
  return {
    getItem: () => value,
    setItem: (_key: string, text: string) => { value = text; },
  };
}

it.each([true, false])('retries a failed import once, preserving its handle and metadata (metadata=%s)', async (metadata) => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => setTimeout(fn, 0));
  const storage = store();
  const complete = vi.fn(async () => {});
  let finish!: (result: { title?: string }) => void;
  const runner = vi.fn<YoutubeImportRunner<{ title?: string }>>()
    .mockImplementationOnce(async (_id, _signal, options) => {
      options.onJob?.({
        jobId: 'known-job', status: 'queued', transportVersion: 2,
        audioFormat: 'orvio-opus-v1',
      });
      if (metadata) options.onMetadata?.({ title: 'Verified song title' });
      throw new AudioJobError('request_timeout', undefined, undefined, undefined, 'service');
    })
    .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const paints: string[] = [];
  const pending = new BackgroundImports(
    () => { paints.push(pending.rows.get('AAAAAAAAAAA')?.state ?? 'done'); },
    complete, storage, runner,
  );
  pending.enqueue('AAAAAAAAAAA');
  await vi.advanceTimersByTimeAsync(10);
  const failed = pending.rows.get('AAAAAAAAAAA');
  expect(failed?.state).toBe('error');
  expect(failed?.title).toBe(metadata ? 'Verified song title' : undefined);
  const restored = new BackgroundImports(() => {}, complete, storage, runner);
  expect(restored.rows.get('AAAAAAAAAAA')?.title).toBe(failed?.title);
  pending.resume();
  await vi.advanceTimersByTimeAsync(1000);
  expect(runner).toHaveBeenCalledTimes(1);

  pending.retry('AAAAAAAAAAA');
  const retrying = pending.rows.get('AAAAAAAAAAA');
  expect(retrying).toMatchObject({ state: 'loading', stage: 'checking', jobId: 'known-job' });
  expect(retrying?.title).toBe(failed?.title);
  expect(retrying?.error).toBeUndefined();
  expect(retrying?.failure).toBeUndefined();
  expect(paints.at(-1)).toBe('loading');
  const paintsBeforeDuplicate = paints.length;
  pending.retry('AAAAAAAAAAA');
  expect(pending.rows.get('AAAAAAAAAAA')).toBe(retrying);
  expect(paints).toHaveLength(paintsBeforeDuplicate);
  await vi.advanceTimersByTimeAsync(10);
  expect(runner).toHaveBeenCalledTimes(2);
  expect(runner.mock.calls[1][2]).toMatchObject({
    retryFailed: true, jobId: 'known-job', transportVersion: 2,
    audioFormat: 'orvio-opus-v1',
  });
  finish({});
  await vi.advanceTimersByTimeAsync(0);
  expect(complete).toHaveBeenCalledWith({ title: failed?.title });
  expect(pending.rows.size).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

it('ignores missing, already-loading and waiting rows without persisting or repainting', () => {
  const storage = store([
    { videoId: 'AAAAAAAAAAA', state: 'loading', waitingForTurn: true },
    { videoId: 'BBBBBBBBBBB', state: 'error', error: 'request_timeout' },
  ]);
  const save = vi.spyOn(storage, 'setItem');
  const changed = vi.fn();
  const runner = vi.fn<YoutubeImportRunner<{ title?: string }>>();
  const pending = new BackgroundImports(changed, async () => {}, storage, runner);
  pending.retry('CCCCCCCCCCC');
  pending.retry('AAAAAAAAAAA');
  // Admission currently drains synchronously; exercise the queue guard through
  // its public query without depending on the private queue representation.
  vi.spyOn(pending, 'isWaiting').mockReturnValue(true);
  pending.retry('BBBBBBBBBBB');
  expect(pending.rows.get('BBBBBBBBBBB')?.state).toBe('error');
  expect(save).not.toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
  expect(runner).not.toHaveBeenCalled();
});

it('ignores retry while the failed attempt is still active and reports storage failure without starting work', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => setTimeout(fn, 0));
  const storage = store();
  const runner = vi.fn<YoutubeImportRunner<{ title?: string }>>()
    .mockRejectedValue(new AudioJobError('request_timeout'));
  const pending = new BackgroundImports(() => {
    if (pending.rows.get('AAAAAAAAAAA')?.state === 'error') pending.retry('AAAAAAAAAAA');
  }, async () => {}, storage, runner);
  pending.enqueue('AAAAAAAAAAA');
  await vi.advanceTimersByTimeAsync(10);
  expect(runner).toHaveBeenCalledTimes(1);
  const failed = pending.rows.get('AAAAAAAAAAA');
  vi.spyOn(storage, 'setItem').mockImplementation(() => { throw Error('full'); });
  expect(() => pending.retry('AAAAAAAAAAA')).toThrow('unavailable');
  expect(pending.rows.get('AAAAAAAAAAA')).toBe(failed);
  await vi.advanceTimersByTimeAsync(10);
  expect(runner).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
