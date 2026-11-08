import { loadCanonicalAudio } from './canonical-audio-api';
import { audioAtStage } from './audio-error-stage';
import { savedCanonical, refreshCanonical } from './canonical-library';
import { localAudio, localMetadata } from './external-local';
import { canonicalForJob } from './canonical-job';
import { readAudioJob, AudioJobError } from './external-audio-api';
import type { SourceRecord } from './external-source';
export interface CanonicalLibraryRow {
  videoId: string;
  title: string;
  archiveId: string;
  jobId?: string;
  state: 'loading' | 'error';
  error?: AudioJobError;
}
export async function verifiedLocalCanonical(videoId: string) {
  const record = await audioAtStage('storage', () => savedCanonical(videoId));
  if (!record) return null;
  const local = await audioAtStage('storage', () => localAudio(record));
  return local ? { record, local } : null;
}
/** Reconcile an archived entry via GET only; never extract or regenerate. */
export async function reconcileCanonical(
  row: CanonicalLibraryRow,
  signal: AbortSignal,
) {
  const deadline = performance.now() + 90000;
  let lookup = await refreshCanonical(row.videoId, signal);
  // A trusted server-cache repair does not require the old job to still exist.
  while (lookup.state === 'pending' || lookup.state === 'replicating') {
    signal.throwIfAborted();
    if (performance.now() >= deadline)
      throw new AudioJobError('request_timeout');
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(
        () => {
          signal.removeEventListener('abort', abort);
          resolve();
        },
        Math.min(
          30000,
          Math.max(
            1000,
            lookup.state === 'pending' || lookup.state === 'replicating'
              ? lookup.retryAfterSec * 1000
              : 1000,
          ),
          Math.max(1, deadline - performance.now()),
        ),
      );
      signal.addEventListener('abort', abort, { once: true });
    });
    lookup = await refreshCanonical(row.videoId, signal);
  }
  if (lookup.state === 'deferred')
    throw new AudioJobError('request_timeout', lookup.retryAfterSec);
  let record: SourceRecord;
  if (lookup.state === 'ready') record = lookup.record;
  else {
    if (!row.jobId)
      throw new AudioJobError(
        lookup.state === 'missing' ? 'not_found' : 'request_timeout',
      );
    const job = await readAudioJob(row.jobId, signal);
    if (job.status !== 'done')
      throw new AudioJobError(
        job.status === 'error'
          ? (job.error?.code ?? 'unavailable')
          : 'request_timeout',
      );
    record = await canonicalForJob(row.videoId, job, signal);
  }
  const local = await audioAtStage('storage', () => localAudio(record));
  if (local)
    return {
      record,
      bytes: local.bytes,
      jobId: local.jobId,
      title: local.title,
      author: local.author,
    };
  const bytes = await loadCanonicalAudio(record, signal);
  const meta = await audioAtStage('storage', () => localMetadata(record));
  return {
    record,
    bytes,
    jobId: row.jobId,
    title: meta?.title ?? row.title,
    author: meta?.author,
  };
}
