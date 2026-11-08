import { readAudioJob, loadAudio, AudioJobError } from './external-audio-api';
import { refreshCanonical } from './canonical-library';
import {
  savedLocalGenerated,
  rememberLocalGenerated,
  recordDigest,
} from './local-generated-library';
import { prepareLocalChartOwned } from './local-chart-worker-client';
import { loadCanonicalAudio } from './canonical-audio-api';
import { localAudio } from './external-local';
import { validSourceRecord, verifyChartHashes } from './external-source';
import { inspectWav } from './canonical-pcm.mjs';
import { audioAtStage } from './audio-error-stage';
import type { PreparedSource } from './external-source-flow';
import type { ImportStage } from './import-progress';
/** A confirmed GET, not a POST mode echo, decides the new local-generation path. */
export async function prepareClientJob(
  videoId: string,
  jobId: string,
  signal: AbortSignal,
  onStage?: (s: ImportStage) => void,
): Promise<PreparedSource | null> {
  const job = await readAudioJob(jobId, signal);
  if (
    job.generationMode !== 'client' ||
    job.status !== 'done' ||
    job.canonical?.status !== 'client_generation'
  )
    return null;
  const canonical = await refreshCanonical(videoId, signal);
  if (canonical.state === 'ready') {
    const cached = await localAudio(canonical.record);
    return {
      record: canonical.record,
      bytes:
        cached?.bytes ?? (await loadCanonicalAudio(canonical.record, signal)),
      restored: true,
    };
  }
  if (canonical.state !== 'missing') throw new AudioJobError('request_timeout');
  const saved = await savedLocalGenerated(videoId);
  if (saved) {
    if (saved.audioSha256 !== job.audio?.sha256)
      throw new AudioJobError('source_changed');
    const cached = await localAudio(saved);
    return {
      record: saved,
      bytes:
        cached?.bytes ??
        (await loadAudio(job, videoId, saved.audioSha256, signal)),
      restored: true,
    };
  }
  if (!job.audio || job.canonical.audioSha256 !== job.audio.sha256)
    throw new AudioJobError('integrity_failed');
  onStage?.('downloading');
  const bytes = await loadAudio(job, videoId, job.audio.sha256, signal);
  // This download has an existing, approved GET recovery route. It has never been
  // attached to catalog/playback state; the worker takes sole ownership, no copy.
  onStage?.('charting');
  const generated = await audioAtStage('analysis', () =>
    prepareLocalChartOwned({
      bytes,
      videoId,
      audioSha256: job.audio!.sha256,
      signal,
    }),
  );
  signal.throwIfAborted();
  const r = generated.record,
    wav = inspectWav(generated.bytes);
  if (
    !validSourceRecord(r) ||
    r.videoId !== videoId ||
    r.audioSha256 !== job.audio.sha256 ||
    r.sampleRate !== wav.sampleRate ||
    r.frames !== wav.frames ||
    !(await verifyChartHashes(r)) ||
    (await recordDigest(r)) !== generated.baseRecordSha256
  )
    throw new AudioJobError('integrity_failed');
  const localRecord = { ...r, sourceProvenance: 'local-current35-v1' as const };
  const digest = await recordDigest(localRecord);
  await audioAtStage('storage', () =>
    rememberLocalGenerated(localRecord, digest),
  );
  signal.throwIfAborted();
  return { record: localRecord, bytes: generated.bytes, restored: false };
}
