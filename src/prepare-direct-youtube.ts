import {
  acquireYoutubeAudio,
  YoutubeDirectApiError,
} from './youtube-direct-api';
import { prepareLocalChartOwned } from './local-chart-worker-client';
import {
  recordDigest,
  rememberLocalGenerated,
  savedLocalGenerated,
} from './local-generated-library';
import { localAudio, localMetadata, saveLocalAudio } from './external-local';
import { listPinnedSources } from './external-source-store';
import { validSourceRecord, verifyChartHashes } from './external-source';
import { inspectWav } from './canonical-pcm.mjs';
import { sha256 } from './opus/opus-descriptor.mjs';
import { AudioJobError } from './external-audio-api';
import { audioAtStage } from './audio-error-stage';
import type { PreparedSource } from './external-source-flow';
import type { ImportStage } from './import-progress';
import { readDirectYoutubeMetadata } from './youtube-direct-metadata';

export interface DirectYoutubeOptions {
  publicKey: string;
  onStage?: (stage: ImportStage) => void;
  onVerified?: () => void;
}

async function storage<T>(
  signal: AbortSignal,
  work: () => Promise<T>,
): Promise<T> {
  signal.throwIfAborted();
  try {
    const result = await work();
    signal.throwIfAborted();
    return result;
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof AudioJobError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new AudioJobError(
      error instanceof Error && error.name === 'QuotaExceededError'
        ? 'storage_full'
        : 'unavailable',
      undefined,
      undefined,
      undefined,
      'storage',
    );
  }
}

/** Explicit Add only: direct verified WAV -> unchanged legacy worker -> durable local library.
 * Playback never invokes this path. Existing pins are immutable, even after a partial save. */
export async function prepareDirectYoutube(
  videoId: string,
  signal: AbortSignal,
  options: DirectYoutubeOptions,
): Promise<
  PreparedSource & { title?: string; author?: string; jobId?: string }
> {
  signal.throwIfAborted();
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId))
    throw new AudioJobError('invalid_url');
  options.onStage?.('checking');
  const saved = await storage(signal, () => savedLocalGenerated(videoId));
  const pins = await storage(signal, () => listPinnedSources(videoId));
  const existing = saved ?? pins[0];
  if (
    existing &&
    pins.some(
      (r) =>
        r.audioSha256 !== existing.audioSha256 ||
        r.chartSetSha256 !== existing.chartSetSha256,
    )
  )
    throw new AudioJobError('source_changed');
  if (existing) {
    if (
      !validSourceRecord(existing) ||
      existing.videoId !== videoId ||
      !(await verifyChartHashes(existing))
    )
      throw new AudioJobError('integrity_failed');
    const cached = await storage(signal, () => localAudio(existing, signal));
    if (cached)
      return {
        record: existing,
        bytes: cached.bytes,
        restored: true,
        title: cached.title,
        author: cached.author,
        jobId: cached.jobId,
      };
  }
  const displayMetadata = readDirectYoutubeMetadata(videoId, {
    publicKey: options.publicKey,
    signal,
  });
  const audio = await acquireYoutubeAudio(videoId, {
    publicKey: options.publicKey,
    signal,
    onStage: ({ stage }) =>
      options.onStage?.(
        stage === 'request'
          ? 'checking'
          : stage === 'waiting'
            ? 'extracting'
            : 'downloading',
      ),
  }).catch((error: unknown) => {
    signal.throwIfAborted();
    if (!(error instanceof YoutubeDirectApiError)) throw error;
    if (error.code === 'aborted')
      throw new DOMException('Aborted', 'AbortError');
    throw new AudioJobError(
      error.code === 'invalid_video_id'
        ? 'invalid_url'
        : error.code === 'oversize'
          ? 'too_long'
          : error.code === 'auth'
            ? 'unavailable'
            : error.code,
      error.retryAfterSec,
      error.status ?? (error.code === 'auth' ? 401 : undefined),
      undefined,
      error.code === 'integrity_failed' ? 'response' : 'service',
    );
  });
  signal.throwIfAborted();
  let wav;
  try {
    wav = inspectWav(audio.bytes);
  } catch {
    throw new AudioJobError(
      'unsupported_format',
      undefined,
      undefined,
      undefined,
      'response',
    );
  }
  if (
    wav.sampleRate !== audio.sampleRate ||
    wav.frames !== audio.frames ||
    wav.frames / wav.sampleRate !== audio.durationSeconds ||
    (await sha256(new Uint8Array(audio.bytes))) !== audio.audioSha256
  )
    throw new AudioJobError('integrity_failed');
  signal.throwIfAborted();
  if (
    existing &&
    (existing.audioSha256 !== audio.audioSha256 ||
      existing.sampleRate !== wav.sampleRate ||
      existing.frames !== wav.frames)
  )
    throw new AudioJobError('source_changed');
  options.onVerified?.();

  let record = existing;
  let bytes = audio.bytes;
  if (!record) {
    options.onStage?.('charting');
    const generated = await audioAtStage('analysis', () =>
      prepareLocalChartOwned({
        bytes,
        videoId,
        audioSha256: audio.audioSha256,
        signal,
      }),
    );
    signal.throwIfAborted();
    const r = generated.record;
    let returned;
    try {
      returned = inspectWav(generated.bytes);
    } catch {
      throw new AudioJobError('integrity_failed');
    }
    if (
      !validSourceRecord(r) ||
      r.videoId !== videoId ||
      r.audioSha256 !== audio.audioSha256 ||
      r.sampleRate !== wav.sampleRate ||
      r.frames !== wav.frames ||
      r.sampleRate !== returned.sampleRate ||
      r.frames !== returned.frames ||
      !(await verifyChartHashes(r)) ||
      (await recordDigest(r)) !== generated.baseRecordSha256 ||
      (await sha256(new Uint8Array(generated.bytes))) !== audio.audioSha256
    )
      throw new AudioJobError('integrity_failed');
    record = { ...r, sourceProvenance: 'local-current35-v1' as const };
    bytes = generated.bytes;
    signal.throwIfAborted();
    options.onStage?.('saving');
    const digest = await recordDigest(record);
    await storage(signal, () =>
      rememberLocalGenerated(record!, digest, signal),
    );
  } else options.onStage?.('saving');
  const metadata = await storage(signal, () => localMetadata(record!));
  const display = await displayMetadata;
  signal.throwIfAborted();
  const title = metadata?.title ?? display?.title ?? 'YouTube · ' + videoId;
  const author = metadata?.author ?? display?.author;
  await storage(signal, () =>
    saveLocalAudio(record!, title, metadata?.jobId, bytes, author),
  );
  return {
    record,
    bytes,
    restored: !!existing,
    title,
    author,
    jobId: metadata?.jobId,
  };
}
