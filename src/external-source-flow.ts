import { readAudioJob, loadAudio, AudioJobError } from './external-audio-api';
import { canonicalForJob } from './canonical-job';
import type { SourceRecord } from './external-source';
export interface PreparedSource {
  record: SourceRecord;
  bytes: ArrayBuffer;
  restored: boolean;
}
/** Preparation from an explicit job. Does not POST, poll, substitute source, or change the original catalog. */
export async function prepareExternalJob(
  videoId: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<PreparedSource> {
  const job = await readAudioJob(jobId, signal);
  if (job.status !== 'done')
    throw new AudioJobError(
      job.status === 'error'
        ? (job.error?.code ?? 'unavailable')
        : 'unavailable',
      job.retryAfterSec,
    );
  const record = await canonicalForJob(videoId, job, signal);
  const bytes = await loadAudio(job, videoId, record.audioSha256, signal);
  return { record, bytes, restored: false };
}
