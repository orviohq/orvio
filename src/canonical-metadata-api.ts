import { AUDIO_BASE } from './external-audio-api';
import type { SourceRecord } from './external-source';
import { queryClient, queryKeys, markQueryEphemeral } from './query-client';
import { assertRuntimeFetch } from './client-only-runtime';
/** Internal sentinel: an unavailable/missing metadata read never becomes
 * cached data; it surfaces as the original null at the call site. */
class MetadataUnavailable extends Error {}
export interface CanonicalMetadata {
  videoId: string;
  title: string;
  author: string | null;
  durationSec: number | null;
  audioSha256: string;
  chartSetSha256: string;
  source: 'audio-manifest';
}
export function validCanonicalMetadata(
  raw: unknown,
  record: SourceRecord,
): raw is CanonicalMetadata {
  const m = raw as Partial<CanonicalMetadata> | null;
  return (
    !!m &&
    m.videoId === record.videoId &&
    m.audioSha256 === record.audioSha256 &&
    m.chartSetSha256 === record.chartSetSha256 &&
    m.source === 'audio-manifest' &&
    typeof m.title === 'string' &&
    m.title.trim().length > 0 &&
    m.title.length <= 300 &&
    !/[\u0000-\u001f\u007f]/.test(m.title) &&
    (m.author === null ||
      (typeof m.author === 'string' &&
        m.author.length <= 200 &&
        !/[\u0000-\u001f\u007f]/.test(m.author))) &&
    (m.durationSec === null ||
      (Number.isInteger(m.durationSec) &&
        m.durationSec! >= 0 &&
        m.durationSec! <= 300))
  );
}
/** Optional display-only recovery. Never changes canonical identity or starts extraction. */
export async function readCanonicalMetadata(
  record: SourceRecord,
  signal?: AbortSignal,
  options?: { persist?: boolean },
): Promise<CanonicalMetadata | null> {
  // Keyed by video + chart set so metadata validated against one record
  // can never be served for another. Persisted; a validated entry is
  // immutable, while an unavailable/missing read keeps the original
  // one-fetch-per-call semantics (errors are never cached as data).
  const queryKey = queryKeys.canonicalMetadata(
    record.videoId,
    record.chartSetSha256 ?? '',
  );
  // Pre-consent callers (shared-link inspect) pass persist: false: the key
  // is marked ephemeral on this page's client so a link view never writes
  // the query-cache snapshot. A normal read clears the mark, so the warm
  // result-route persistence of the same shared key is never downgraded.
  markQueryEphemeral(queryKey, options?.persist === false);
  return queryClient
    .fetchQuery({
      queryKey,
      queryFn: async () => {
        const data = await fetchCanonicalMetadata(record, signal);
        if (data === null) throw new MetadataUnavailable();
        return data;
      },
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
    })
    .catch((error) => {
      if (error instanceof MetadataUnavailable) return null;
      throw error;
    });
}
async function fetchCanonicalMetadata(
  record: SourceRecord,
  signal?: AbortSignal,
): Promise<CanonicalMetadata | null> {
  const url = `${AUDIO_BASE}/v1/chart-sources/${encodeURIComponent(record.videoId)}/metadata`;
  assertRuntimeFetch(url);
  const response = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const p = await reader.read();
      if (p.done) break;
      size += p.value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return null;
      }
      parts.push(p.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.byteLength;
  }
  const text = new TextDecoder().decode(bytes);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!validCanonicalMetadata(raw, record)) return null;
  return {
    ...raw,
    author:
      typeof raw.author === 'string' && raw.author.trim() ? raw.author : null,
  };
}
