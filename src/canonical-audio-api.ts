import { AUDIO_BASE, AudioJobError } from './external-audio-api';
import { queryClient, queryKeys } from './query-client';
import { readAudioLimit } from './audio-limit-message';
import { AUDIO_MAX_BYTES } from './audio-limits.mjs';
import { inspectWav } from './canonical-pcm.mjs';
import type { SourceRecord } from './external-source';
/** Read retained, pin-bound audio only. Never creates a job, extracts or saves partial bytes.
 * Missing-pin GET may run the server's existing canonical metadata repair; it cannot extract audio.
 */
export async function loadCanonicalAudio(
  record: SourceRecord,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  if (
    !/^[A-Za-z0-9_-]{11}$/.test(record.videoId) ||
    !/^[a-f0-9]{64}$/.test(record.audioSha256)
  )
    throw new AudioJobError('integrity_failed');
  signal?.throwIfAborted();
  // Query-coordinated transport: concurrent reads of the same pin-bound
  // audio dedup onto one download. staleTime 0 keeps every call live and
  // gcTime 0 drops the bytes the moment no caller holds them - the PCM is
  // never retained by the query cache and never persisted.
  return queryClient.fetchQuery({
    queryKey: queryKeys.canonicalAudioBytes(record.videoId, record.audioSha256),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: ({ signal: querySignal }) =>
      downloadCanonicalAudio(
        record,
        signal ? AbortSignal.any([querySignal, signal]) : querySignal,
        signal,
      ),
  });
}
async function downloadCanonicalAudio(
  record: SourceRecord,
  signal: AbortSignal,
  callerSignal?: AbortSignal,
): Promise<ArrayBuffer> {
  let response: Response;
  try {
    response = await fetch(
      `${AUDIO_BASE}/v1/chart-sources/${record.videoId}/audio`,
      { signal },
    );
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
