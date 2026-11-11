import { AUDIO_BASE, AudioJobError } from './external-audio-api';
import { assertRuntimeFetch } from './client-only-runtime';
import { queryClient, queryKeys } from './query-client';
import { readAudioLimit } from './audio-limit-message';
import { AUDIO_MAX_BYTES } from './audio-limits.mjs';
import { inspectWav } from './canonical-pcm.mjs';
import type { SourceRecord } from './external-source';
let audioRead = 0;
/** Read retained, pin-bound audio only. Never creates a job, extracts or saves partial bytes.
 * Missing-pin GET may run the server's existing canonical metadata repair; it cannot extract audio.
 */
export async function loadCanonicalAudio(
  record: SourceRecord,
  signal?: AbortSignal,
  route: 'canonical' | 'retained' = 'canonical',
): Promise<ArrayBuffer> {
  if (
    !/^[A-Za-z0-9_-]{11}$/.test(record.videoId) ||
    !/^[a-f0-9]{64}$/.test(record.audioSha256)
  )
    throw new AudioJobError('integrity_failed');
  signal?.throwIfAborted();
  // Bytes have one owner: callers may transfer or decode this buffer.
  // Unique requests isolate cancellation, frozen WAV identity and transfer.
  // Never copy a full WAV just to retain network deduplication.
  return queryClient.fetchQuery({
    queryKey: [
      ...queryKeys.canonicalAudioBytes(record.videoId, record.audioSha256),
      route,
      record.frames,
      record.sampleRate,
      ++audioRead,
    ],
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: ({ signal: querySignal }) =>
      downloadCanonicalAudio(
        record,
        signal ? AbortSignal.any([querySignal, signal]) : querySignal,
        signal,
        route,
      ),
  });
}
async function downloadCanonicalAudio(
  record: SourceRecord,
  signal: AbortSignal,
  callerSignal?: AbortSignal,
  route: 'canonical' | 'retained' = 'canonical',
): Promise<ArrayBuffer> {
  const url =
    route === 'retained'
      ? `${AUDIO_BASE}/v1/audio-sources/${record.videoId}/${record.audioSha256}/audio`
      : `${AUDIO_BASE}/v1/chart-sources/${record.videoId}/audio`;
  assertRuntimeFetch(url);
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (callerSignal?.aborted || signal.aborted) throw error;
    throw new AudioJobError(
      'network_error',
      undefined,
      undefined,
      undefined,
      'service',
    );
  }
  if (response.status !== 200) {
    const body = await response.json().catch(() => null);
    const code =
      typeof body?.error === 'string' ? body.error : body?.error?.code;
    const retry = body?.retryAfterSec ?? body?.error?.retryAfterSec;
    const retryAfter = Number.isFinite(retry) && retry >= 0 ? retry : undefined;
    throw new AudioJobError(
      response.status === 202 &&
        [
          'chart_source_pending',
          'chart_source_deferred',
          'chart_source_replicating',
        ].includes(code)
        ? 'request_timeout'
        : response.status === 404 && code === 'chart_source_not_found'
          ? 'not_found'
          : response.status === 410 && code === 'audio_expired'
            ? 'audio_expired'
            : response.status === 409 && code === 'audio_changed'
              ? 'source_changed'
              : response.status === 409 && code === 'audio_corrupt'
                ? 'integrity_failed'
                : response.status === 429 && code === 'rate_limited'
                  ? 'rate_limited'
                  : 'unavailable',
      retryAfter,
      response.status,
      code === 'rate_limited' ? readAudioLimit(body?.error) : undefined,
      'service',
    );
  }
  const lengthHeader = response.headers.get('Content-Length');
  const size =
    lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : NaN;
  if (
    !Number.isSafeInteger(size) ||
    size < 44 ||
    size > AUDIO_MAX_BYTES ||
    response.headers.get('X-Content-SHA256') !== record.audioSha256 ||
    response.headers.get('X-Canonical-Audio-SHA256') !== record.audioSha256 ||
    response.headers.get('X-Source-Video-Id') !== record.videoId ||
    response.headers.get('X-Audio-Contract') !== 'audio/1' ||
    !response.headers.get('Content-Type')?.startsWith('audio/wav') ||
    !response.body
  ) {
    await response.body?.cancel().catch(() => {});
    throw new AudioJobError('integrity_failed');
  }
  const reader = response.body.getReader(),
    joined = new Uint8Array(size);
  let offset = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      if (offset + value.byteLength > size)
        throw new AudioJobError('integrity_failed');
      joined.set(value, offset);
      offset += value.byteLength;
    }
  } catch (error) {
    if (
      callerSignal?.aborted ||
      signal.aborted ||
      error instanceof AudioJobError
    )
      throw error;
    throw new AudioJobError(
      'network_error',
      undefined,
      200,
      undefined,
      'response',
    );
  } finally {
    await reader.cancel().catch(() => {});
  }
  signal.throwIfAborted();
  if (offset !== size) throw new AudioJobError('integrity_failed');
  const sha = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', joined)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (sha !== record.audioSha256) throw new AudioJobError('integrity_failed');
  try {
    const wav = inspectWav(joined.buffer);
    if (wav.sampleRate !== record.sampleRate || wav.frames !== record.frames)
      throw Error('WAV identity differs');
  } catch {
    throw new AudioJobError('integrity_failed');
  }
  signal.throwIfAborted();
  return joined.buffer;
}

/** Immutable retained audio, independent of transient jobs and server chart pins. */
export const loadRetainedAudio = (record: SourceRecord, signal?: AbortSignal) =>
  loadCanonicalAudio(record, signal, 'retained');
