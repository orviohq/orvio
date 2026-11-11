/** Image-only cache: never opens or changes the music/chart databases. */
export const YOUTUBE_ART_CACHE = 'orvio-youtube-art-v1';
export const ART_FALLBACK = '/wallpapers/first-light.png';
const resolved = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
export function thumbnailCandidates(videoId: string): string[] {
  return /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? ['maxresdefault', 'mqdefault', 'hqdefault'].map(
        (size) => `https://i.ytimg.com/vi/${videoId}/${size}.jpg`,
      )
    : [];
}

async function decode(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => finish(false), 6000);
    const finish = (valid: boolean) => {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      resolve(valid);
    };
    image.referrerPolicy = 'no-referrer';
    image.onload = () =>
      finish(image.naturalWidth >= 240 && image.naturalHeight >= 135);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

async function readableImage(response: Response): Promise<string | null> {
  if (
    !response.ok ||
    !/^image\/(jpeg|png|webp)(?:;|$)/i.test(
      response.headers.get('content-type') ?? '',
    )
  )
    return null;
  const blob = await response.blob();
  if (!blob.size || blob.size > 4 * 1024 * 1024) return null;
  const url = URL.createObjectURL(blob);
  if (await decode(url)) return url;
  URL.revokeObjectURL(url);
  return null;
}

async function load(videoId: string): Promise<string> {
  const candidates = thumbnailCandidates(videoId);
  if (!candidates.length) return ART_FALLBACK;
  let cache: Cache | undefined;
  try {
    cache = await caches.open(YOUTUBE_ART_CACHE);
  } catch {}
  // Search all cached sizes before networking; honor older URL-keyed image
  // caches without migrating or deleting their entries.
  for (const url of candidates) {
    try {
      const response = (await cache?.match(url)) ?? (await caches.match(url));
      if (response) {
        const local = await readableImage(response);
        if (local) return local;
      }
    } catch {}
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return ART_FALLBACK;
  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(6000),
      });
      const local = await readableImage(response.clone());
      if (!local) continue;
      // Quota/private-mode failure must not hide successfully decoded artwork.
      try {
        await cache?.put(url, response);
      } catch {}
      return local;
    } catch {
      // CORS failure can still permit ordinary image display. This branch
      // does not claim durable offline storage.
      if (await decode(url)) return url;
    }
  }
  return ART_FALLBACK;
}

export function ensureYoutubeArtwork(videoId: string): Promise<string> {
  if (!thumbnailCandidates(videoId).length)
    return Promise.resolve(ART_FALLBACK);
  const existing = pending.get(videoId);
  if (existing) return existing;
  const task = load(videoId)
    .catch(() => ART_FALLBACK)
    .then((url) => {
      resolved.set(videoId, url);
      if (typeof document !== 'undefined')
        document.dispatchEvent(
          new CustomEvent('orvio:youtube-art-ready', { detail: videoId }),
        );
      return url;
    });
  pending.set(videoId, task);
  return task;
}

export function youtubeArtwork(videoId: string): string {
  void ensureYoutubeArtwork(videoId);
  return resolved.get(videoId) ?? ART_FALLBACK;
}

if (typeof window !== 'undefined')
  window.addEventListener('online', () => {
    for (const [id, url] of resolved)
      if (url === ART_FALLBACK) {
        pending.delete(id);
        void ensureYoutubeArtwork(id);
      }
  });
