import { traceSpan, type ImportTrace } from '../import-trace';
import {
  createOpus35Job,
  readOpus35Job,
  prepareOpus35Job,
  type Opus35Handle,
} from './opus35-api';
import type { ImportResult } from '../external-import';
import type { ImportStage } from '../import-progress';
import type { AudioJob } from '../external-audio-api';
import { AudioJobError } from '../external-audio-api';
export type Opus35JobNotice = AudioJob & {
  transportVersion: 2;
  audioFormat: 'orvio-opus-v1';
};
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(t);
      reject(signal.reason);
    };
    const t = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
export async function importOpus35(
  videoId: string,
  signal: AbortSignal,
  options: {
    trace?: ImportTrace | null;
    jobId?: string;
    retryFailed?: boolean;
    onStage?: (stage: ImportStage) => void;
    onJob?: (job: Opus35JobNotice) => void;
  },
): Promise<ImportResult> {
  let handle: Opus35Handle | undefined = options.jobId
    ? {
        jobId: options.jobId,
        videoId,
        transportVersion: 2,
        audioFormat: 'orvio-opus-v1',
      }
    : undefined;
  // Reload reads an existing handle. Never retry a terminal/unknown job through
  // a POST unless a fresh explicit Add requested a proven retryable ERROR.
  let j = handle
    ? await traceSpan(options.trace, 'opus-job-read', () =>
        readOpus35Job(handle!, signal, options.trace),
      )
    : await traceSpan(options.trace, 'opus-job-create', () =>
        createOpus35Job(videoId, signal, undefined, false, options.trace),
      );
  if (
    handle &&
    j.status === 'error' &&
    j.canRetry === true &&
    options.retryFailed
  )
    j = await traceSpan(options.trace, 'opus-job-retry-create', () =>
      createOpus35Job(videoId, signal, handle, true, options.trace),
    );
  const end = performance.now() + 90000;
  for (;;) {
    signal.throwIfAborted();
    handle = {
      jobId: j.jobId,
      videoId,
      transportVersion: 2,
      audioFormat: 'orvio-opus-v1',
    };
    options.onJob?.({
      ...handle,
      status:
        j.status === 'verified'
          ? 'done'
          : j.status === 'pending'
            ? 'queued'
            : 'error',
    });
    if (j.status === 'verified') break;
    if (j.status === 'failed')
      throw new AudioJobError(
        'too_long',
        undefined,
        undefined,
        undefined,
        'service',
      );
    if (j.status === 'error')
      // A validated terminal backend failure is a service failure, never a
      // browser analysis or local-storage failure. Unknown work stays unknown.
      throw new AudioJobError(
        'unavailable',
        undefined,
        undefined,
        undefined,
        'service',
      );
    if (j.status === 'unknown') throw new AudioJobError('unavailable');
    if (performance.now() >= end) throw new AudioJobError('request_timeout');
    options.onStage?.('queued');
    await traceSpan(options.trace, 'opus-poll-wait', () => pause(5000, signal));
    j = await traceSpan(options.trace, 'opus-poll-read', () =>
      readOpus35Job(handle!, signal, options.trace),
    );
  }
  options.onStage?.('downloading');
  const prepared = await prepareOpus35Job(j, signal, {
    trace: options.trace,
    onStage: options.onStage,
  });
  signal.throwIfAborted();
  return { prepared, jobId: handle.jobId };
}
