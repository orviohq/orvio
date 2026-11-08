import { AUDIO_BASE, AudioJobError } from './external-audio-api';
import type { SourceRecord } from './external-source';
/** Anchor must come from a separately accepted pin contract, never this response. */
export interface ProgressivePinAnchor {
  videoId: string;
  audioSha256: string;
  chartSetSha256: string;
  manifestSha256: string;
}
const SHA = /^[a-f0-9]{64}$/;
/** No anchor means legacy whole-file playback, with no additional request. */
export async function readProgressiveManifest(
  record: SourceRecord,
  anchor?: ProgressivePinAnchor,
  signal?: AbortSignal,
): Promise<{ manifest: unknown; anchor: ProgressivePinAnchor } | null> {
  if (!anchor) return null;
  if (
    !/^[A-Za-z0-9_-]{11}$/.test(record.videoId) ||
    anchor.videoId !== record.videoId ||
    anchor.audioSha256 !== record.audioSha256 ||
    anchor.chartSetSha256 !== record.chartSetSha256 ||
    !SHA.test(anchor.manifestSha256)
  )
    throw new AudioJobError('integrity_failed');
  let response: Response;
  try {
    response = await fetch(
      `${AUDIO_BASE}/v1/chart-sources/${record.videoId}/progressive-manifest`,
      { signal },
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AudioJobError('network_error');
  }
  if (response.status === 404) {
    await response.body?.cancel().catch(() => {});
    // A known new-pin anchor cannot silently downgrade when its manifest vanishes.
    throw new AudioJobError('integrity_failed');
  }
  if (
    response.status !== 200 ||
    !response.headers.get('Content-Type')?.startsWith('application/json') ||
    !response.body
  ) {
    await response.body?.cancel().catch(() => {});
    throw new AudioJobError('unavailable');
  }
  const reader = response.body.getReader();
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', abort, { once: true });
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 262144) throw new AudioJobError('integrity_failed');
      parts.push(part.value);
    }
    signal?.throwIfAborted();
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const p of parts) {
      bytes.set(p, offset);
      offset += p.length;
    }
    let raw: any;
    try {
      raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      throw new AudioJobError('integrity_failed');
    }
    if (
      !raw ||
      raw.videoId !== anchor.videoId ||
      raw.audioSha256 !== anchor.audioSha256 ||
      raw.chartSetSha256 !== anchor.chartSetSha256 ||
      raw.manifestSha256 !== anchor.manifestSha256 ||
      !raw.manifest ||
      typeof raw.manifest !== 'object'
    )
      throw new AudioJobError('integrity_failed');
    // Driver independently validates geometry and canonical manifest digest before scheduling.
    return { manifest: raw.manifest, anchor };
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
  }
}
