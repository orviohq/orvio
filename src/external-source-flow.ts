import type { ImportStage } from './import-progress';
import { readAudioJob, loadAudio, AudioJobError } from './external-audio-api';
import { canonicalForJob } from './canonical-job';
import type { PlayableSourceRecord as SourceRecord } from './playable-source';
import { traceSpan, type ImportTrace } from './import-trace';
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
  trace?: ImportTrace | null,
): Promise<PreparedSource> {
  const job = await traceSpan(trace, 'job-read', () =>
    readAudioJob(jobId, signal),
  );
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
  const record = await canonicalForJob(videoId, job, signal, onStage, trace);
  onStage?.('downloading');
  const bytes = await traceSpan(trace, 'audio-download', () =>
    loadAudio(job, videoId, record.audioSha256, signal, trace),
  );
  return { record, bytes, restored: false };
}
