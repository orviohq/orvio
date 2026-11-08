import { audioAtStage } from './audio-error-stage';
import { readCanonicalSource } from './canonical-source-api';
import { rememberCanonical } from './canonical-library';
import {
  readAudioJob,
  AudioJobError,
  type AudioJob,
} from './external-audio-api';
function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
/** Known-job GET may enqueue trusted server generation. Never another extraction POST. */
export async function canonicalForJob(
  videoId: string,
  job: AudioJob,
  signal?: AbortSignal,
) {
  const deadline = performance.now() + 90000;
  for (;;) {
    signal?.throwIfAborted();
    const lookup = await readCanonicalSource(videoId, signal);
    if (lookup.state === 'ready') {
      if (lookup.record.audioSha256 !== job.audio?.sha256)
        throw new AudioJobError('source_changed');
      await audioAtStage('storage', () =>
        rememberCanonical(lookup.record, lookup.recordSha256),
      );
      return lookup.record;
    }
    if (performance.now() >= deadline)
      throw new AudioJobError('request_timeout');
    job = await readAudioJob(job.jobId, signal);
    if (job.status === 'error')
      throw new AudioJobError(
        job.error?.code ?? 'unavailable',
        undefined,
        undefined,
        undefined,
        'service',
      );
    if (job.status !== 'done') throw new AudioJobError('unavailable');
    if (job.canonical?.status === 'audio_changed')
      throw new AudioJobError('source_changed');
    if (job.canonical?.status === 'audio_expired')
      throw new AudioJobError('audio_expired');
    if (job.canonical?.status === 'deferred' || lookup.state === 'deferred')
      throw new AudioJobError(
        'request_timeout',
        job.canonical?.retryAfterSec ??
          (lookup.state === 'deferred' ? lookup.retryAfterSec : undefined),
      );
    const seconds =
      lookup.state === 'missing'
        ? (job.canonical?.retryAfterSec ?? 3)
        : lookup.retryAfterSec;
    await wait(
      Math.min(
        30000,
        Math.max(1000, seconds * 1000),
        Math.max(1, deadline - performance.now()),
      ),
      signal,
    );
  }
}
