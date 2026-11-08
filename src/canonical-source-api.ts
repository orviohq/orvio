import { AUDIO_BASE, AudioJobError } from './external-audio-api';
import {
  validSourceRecord,
  verifyChartHashes,
  presentChartKeys,
  type SourceRecord,
} from './external-source';
export type CanonicalLookup =
  | {
      state: 'ready';
      record: SourceRecord;
      recordSha256: string;
      audioCached: boolean;
    }
  | { state: 'missing' }
  | { state: 'pending' | 'deferred' | 'replicating'; retryAfterSec: number };
const SHA = /^[a-f0-9]{64}$/;
// Client receive bound independent of HTTP Content-Length, not a backend cap claim.
export const MAX_CANONICAL_RECORD_BYTES = 4 * 1024 * 1024;
async function boundedBytes(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new AudioJobError('integrity_failed');
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_CANONICAL_RECORD_BYTES)
        throw new AudioJobError('integrity_failed');
      parts.push(part.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
/** Authoritative GET only. No local generation, POST, identity fallback or silent retry. */
export async function readCanonicalSource(
  videoId: string,
  signal?: AbortSignal,
): Promise<CanonicalLookup> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId))
    throw new AudioJobError('invalid_url');
  let response: Response;
  try {
    response = await fetch(`${AUDIO_BASE}/v1/chart-sources/${videoId}`, {
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AudioJobError('network_error');
  }
  if (response.status === 404 || response.status === 202) {
    const body = await response.json().catch(() => null);
    if (response.status === 404 && body?.error === 'chart_source_not_found')
      return { state: 'missing' };
    const state = (
      {
        chart_source_pending: 'pending',
        chart_source_deferred: 'deferred',
        chart_source_replicating: 'replicating',
      } as const
    )[body?.error as 'chart_source_pending'];
    if (
      response.status === 202 &&
      state &&
      Number.isFinite(body.retryAfterSec) &&
      body.retryAfterSec >= 0
    )
      return {
        state,
        retryAfterSec: Math.max(
          1,
          Math.min(86400, Math.ceil(body.retryAfterSec)),
        ),
      };
    throw new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      'response',
    );
  }
  if (response.status === 409) throw new AudioJobError('integrity_failed');
  if (!response.ok)
    throw new AudioJobError(
      'unavailable',
      undefined,
      response.status,
      undefined,
      'service',
    );
  const expected = response.headers.get('X-SourceRecord-SHA256'),
    chartSet = response.headers.get('X-ChartSet-SHA256'),
    audio = response.headers.get('X-Canonical-Audio-SHA256');
  if (
    !expected ||
    !SHA.test(expected) ||
    !chartSet ||
    !SHA.test(chartSet) ||
    !audio ||
    !SHA.test(audio)
  )
    throw new AudioJobError('integrity_failed');
  const bytes = await boundedBytes(response);
  const actual = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
  if (actual !== expected) throw new AudioJobError('integrity_failed');
  let record: unknown;
  try {
    record = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    );
  } catch {
    throw new AudioJobError('integrity_failed');
  }
  if (
    !validSourceRecord(record) ||
    record.videoId !== videoId ||
    record.audioSha256 !== audio ||
    record.chartSetSha256 !== chartSet ||
    presentChartKeys(record).length !== 8 ||
    !record.chartMetadata ||
    !(await verifyChartHashes(record))
  )
    throw new AudioJobError('integrity_failed');
  signal?.throwIfAborted();
  return {
    state: 'ready',
    record,
    recordSha256: expected,
    audioCached: response.headers.get('X-Canonical-Audio-Cached') === 'true',
  };
}
