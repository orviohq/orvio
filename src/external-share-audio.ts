import { isOpusRecord } from './playable-source';
import { loadCanonicalAudio, loadRetainedAudio } from './canonical-audio-api';
import {
  createAudioJob,
  readAudioJob,
  loadAudio,
  AudioJobError,
  type AudioJob,
} from './external-audio-api';
import { localAudio, saveLocalAudio } from './external-local';
import { inspectWav } from './canonical-pcm.mjs';
import type { PlayableSourceRecord } from './playable-source';
import { restoreOpus35Record } from './opus/opus35-api';
import type { ExternalSong } from './external-catalog';
import {
  CLIENT_ONLY_MODE,
  rejectRemoteOnly,
  requireLocalAudio,
} from './client-only-runtime';

export interface SharedAudioDeps {
  /** Replace only for focused tests; production uses the persisted reader. */
  localAudio?: typeof localAudio;
}
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
async function attach(
  item: ExternalSong<PlayableSourceRecord>,
  job: AudioJob,
  signal: AbortSignal,
) {
  if (job.status === 'error')
    throw new AudioJobError(job.error?.code ?? 'unavailable');
  if (job.status !== 'done') throw new AudioJobError('unavailable');
  if (job.audio?.sha256 !== item.record.audioSha256)
    throw new AudioJobError('source_changed');
  const bytes = await loadAudio(
    job,
    item.record.videoId,
    item.record.audioSha256,
    signal,
  );
  const wav = inspectWav(bytes);
  if (
    wav.frames !== item.record.frames ||
    wav.sampleRate !== item.record.sampleRate
  )
    throw new AudioJobError('source_changed');
  await saveLocalAudio(item.record, item.song.title, job.jobId, bytes);
  item.bytes = bytes;
  item.jobId = job.jobId;
  return bytes;
}
/** Playback may read the existing artifact, never create a replacement extraction. */
export async function readSharedAudio(
  item: ExternalSong<PlayableSourceRecord>,
  signal = AbortSignal.timeout(90000),
  deps: SharedAudioDeps = {},
) {
  if (item.bytes) return item.bytes;
  if (CLIENT_ONLY_MODE) {
    // Client-only playback has exactly one source: verified local bytes.
    // Missing or corrupt local audio is explicit and never falls through to
    // the canonical/retained audio GETs or the opus descriptor fetch below.
    const local = await requireLocalAudio(
      item.record.videoId,
      () => (deps.localAudio ?? localAudio)(item.record, signal),
      signal,
    );
    item.bytes = local.bytes;
    item.jobId = local.jobId;
    return local.bytes;
  }
  const local = await localAudio(item.record, signal);
  if (local) {
    item.bytes = local.bytes;
    item.jobId = local.jobId;
    return local.bytes;
  }
  if (isOpusRecord(item.record)) {
    const bytes = await restoreOpus35Record(item.record, signal);
    await saveLocalAudio(
      item.record,
      item.song.title,
      item.jobId,
      bytes,
      item.song.subtitle,
    );
    item.bytes = bytes;
    return bytes;
  }
  // Read by exact frozen video+audio SHA, without trusting a client chart as a
  // global canonical pin. Verify the entire WAV/hash before local persistence.
  // Existing progressive playback still uses its canonical manifest path.
  const bytes =
    item.record.sourceProvenance === 'local-current35-v1'
      ? await loadRetainedAudio(item.record, signal)
      : await loadCanonicalAudio(item.record, signal);
  await saveLocalAudio(item.record, item.song.title, item.jobId, bytes);
  item.bytes = bytes;
  return bytes;
}
/** Only an explicit recovery button may call this. Frozen chart is never regenerated. */
export async function recoverSharedAudio(
  item: ExternalSong<PlayableSourceRecord>,
  signal = AbortSignal.timeout(90000),
) {
  if (CLIENT_ONLY_MODE)
    rejectRemoteOnly(
      isOpusRecord(item.record) ? 'opus-bridge' : 'audio-job-read',
    );
  if (isOpusRecord(item.record)) return readSharedAudio(item, signal);
  let job = await createAudioJob(
    'https://www.youtube.com/watch?v=' + item.record.videoId,
    signal,
    item.record.sourceProvenance === 'local-current35-v1'
      ? 'client'
      : undefined,
  );
  while (job.status === 'queued' || job.status === 'running') {
    await wait(
      Math.max(3, Math.min(30, job.retryAfterSec ?? 3)) * 1000,
      signal,
    );
    job = await readAudioJob(job.jobId, signal);
  }
  return attach(item, job, signal);
}
