import { readAudioJob, loadAudio, AudioJobError } from './external-audio-api';
import { generateSourceRecord } from './external-source-provider';
import {
  listPinnedSources,
  pinSource,
  readPinnedSource,
} from './external-source-store';
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
  const pinned = await listPinnedSources(videoId);
  const first = pinned[0];
  const job = await readAudioJob(jobId, signal);
  if (job.status !== 'done')
    throw new AudioJobError(
      job.status === 'error'
        ? (job.error?.code ?? 'unavailable')
        : 'unavailable',
      job.retryAfterSec,
    );
  if (first && job.audio!.sha256 !== first.audioSha256)
    throw new AudioJobError('source_changed');
  const bytes = await loadAudio(job, videoId, first?.audioSha256, signal);
  if (first) return { record: first, bytes, restored: true };
  const generated = await generateSourceRecord(
    bytes,
    videoId,
    job.audio!.sha256,
  );
  await pinSource(generated);
  const record = await readPinnedSource(videoId, generated.audioSha256);
  if (!record) throw Error('Local chart save could not be confirmed');
  return { record, bytes, restored: false };
}
