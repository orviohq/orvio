import type { ImportStage } from './import-progress';
import { readAudioJob, loadAudio, AudioJobError } from './external-audio-api';
import { canonicalForJob } from './canonical-job';
import type { SourceRecord } from './external-source';
export interface PreparedSource {
  record: SourceRecord;
  bytes: ArrayBuffer;
  restored: boolean;
}
/** Known-job GET preparation, including bounded canonical-status GETs. Never extracts via POST, generates locally, or substitutes an archive. */
export async function prepareExternalJob(
  videoId: string,
  jobId: string,
  signal?: AbortSignal,
  onStage?: (stage: ImportStage) => void,
): Promise<PreparedSource> {
  const job = await readAudioJob(jobId, signal);
  if (job.status !== 'done')
    throw new AudioJobError(
      job.status === 'error'
        ? (job.error?.code ?? 'unavailable')
        : 'unavailable',
      job.retryAfterSec,
      undefined,
      undefined,
      job.status === 'error' ? 'service' : 'response',
    );
  const record = await canonicalForJob(videoId, job, signal, onStage);
  onStage?.('downloading');
  const bytes = await loadAudio(job, videoId, record.audioSha256, signal);
  return { record, bytes, restored: false };
}
