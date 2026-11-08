import { AUDIO_BASE } from './external-audio-api';
export interface EarlyYoutubeMetadata {
  videoId: string;
  title: string;
  author: string | null;
  thumbnailUrl: string;
  source: 'youtube-oembed';
}
const text = (v: unknown, max: number) =>
  typeof v === 'string' &&
  v.trim().length > 0 &&
  v.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(v);
export function validEarlyMetadata(
  raw: unknown,
  id: string,
): raw is EarlyYoutubeMetadata {
  const x = raw as EarlyYoutubeMetadata | null;
  return (
    /^[A-Za-z0-9_-]{11}$/.test(id) &&
    !!x &&
    x.videoId === id &&
    x.source === 'youtube-oembed' &&
    text(x.title, 200) &&
    (x.author === null || text(x.author, 100)) &&
    x.thumbnailUrl === `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  );
}
/** Optional display only. Never proves canonical identity or starts extraction. */
export async function earlyYoutubeMetadata(
  id: string,
  signal?: AbortSignal,
): Promise<EarlyYoutubeMetadata | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  try {
    const r = await fetch(`${AUDIO_BASE}/v1/youtube-metadata/${id}`, {
      signal: signal ?? AbortSignal.timeout(4000),
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!r.ok) return null;
    const reader = r.body?.getReader();
    if (!reader) return null;
    const parts: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const p = await reader.read();
        if (p.done) break;
        size += p.value.byteLength;
        if (size > 16384) {
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
    const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return validEarlyMetadata(raw, id) ? raw : null;
  } catch {
    return null;
  }
}
