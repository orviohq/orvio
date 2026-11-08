import { loadCanonicalAudio } from './canonical-audio-api';
import {
  createAudioJob,
  readAudioJob,
  loadAudio,
  AudioJobError,
  type AudioJob,
} from './external-audio-api';
import { localAudio, saveLocalAudio } from './external-local';
import { inspectWav } from './canonical-pcm.mjs';
import type { ExternalSong } from './external-catalog';
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
async function attach(item: ExternalSong, job: AudioJob, signal: AbortSignal) {
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
  item: ExternalSong,
  signal = AbortSignal.timeout(90000),
) {
  if (item.bytes) return item.bytes;
  const local = await localAudio(item.record);
  if (local) {
    item.bytes = local.bytes;
    item.jobId = local.jobId;
    return local.bytes;
  }
  // The stable audio route verifies the server's canonical pin. Its response
  // must match the frozen share's video/hash, and loadCanonicalAudio verifies
  // the complete body hash and WAV frame/rate before returning any bytes.
  // A second full chart-record GET adds latency but no extra audio authority.
  const bytes = await loadCanonicalAudio(item.record, signal);
  await saveLocalAudio(item.record, item.song.title, item.jobId, bytes);
  item.bytes = bytes;
  return bytes;
}
/** Only an explicit recovery button may call this. Frozen chart is never regenerated. */
export async function recoverSharedAudio(
  item: ExternalSong,
  signal = AbortSignal.timeout(90000),
) {
  let job = await createAudioJob(
    'https://www.youtube.com/watch?v=' + item.record.videoId,
    signal,
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
