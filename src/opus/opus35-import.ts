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
    ? await readOpus35Job(handle, signal)
    : await createOpus35Job(videoId, signal);
  if (
    handle &&
    j.status === 'error' &&
    j.canRetry === true &&
    options.retryFailed
  )
    j = await createOpus35Job(videoId, signal, handle, true);
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
    if (j.status === 'unknown' || j.status === 'error')
      throw new AudioJobError('unavailable');
    if (performance.now() >= end) throw new AudioJobError('request_timeout');
    options.onStage?.('queued');
    await pause(5000, signal);
    j = await readOpus35Job(handle, signal);
  }
  options.onStage?.('downloading');
  const prepared = await prepareOpus35Job(j, signal);
  signal.throwIfAborted();
  return { prepared, jobId: handle.jobId };
}
