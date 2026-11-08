import { savedCanonical, refreshCanonical } from './canonical-library';
import { localAudio, localMetadata } from './external-local';
import { canonicalForJob } from './canonical-job';
import { readAudioJob, loadAudio, AudioJobError } from './external-audio-api';
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
  const record = await savedCanonical(videoId);
  if (!record) return null;
  const local = await localAudio(record);
  return local ? { record, local } : null;
}
/** Reconcile an archived entry via GET only; never extract or regenerate. */
export async function reconcileCanonical(
  row: CanonicalLibraryRow,
  signal: AbortSignal,
) {
  const lookup = await refreshCanonical(row.videoId, signal);
  let record: SourceRecord;
  if (lookup.state === 'ready') record = lookup.record;
  else {
    if (!row.jobId)
      throw new AudioJobError(
        lookup.state === 'missing' ? 'audio_expired' : 'request_timeout',
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
  const local = await localAudio(record);
  if (local)
    return {
      record,
      bytes: local.bytes,
      jobId: local.jobId,
      title: local.title,
      author: local.author,
    };
  if (!row.jobId) throw new AudioJobError('audio_expired');
  const job = await readAudioJob(row.jobId, signal);
  if (job.status !== 'done') throw new AudioJobError('audio_expired');
  if (job.audio?.sha256 !== record.audioSha256)
    throw new AudioJobError('source_changed');
  const bytes = await loadAudio(job, row.videoId, record.audioSha256, signal);
  const meta = await localMetadata(record);
  return {
    record,
    bytes,
    jobId: job.jobId,
    title: meta?.title ?? row.title,
    author: meta?.author,
  };
}
