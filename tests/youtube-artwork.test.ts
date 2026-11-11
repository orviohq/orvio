import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const ID = 'uXn-zOt68V8';
const response = () =>
  new Response(new Blob(['image pixels']), {
    headers: { 'content-type': 'image/jpeg' },
  });
let rows: Map<string, Response>;
let put: ReturnType<typeof vi.fn>;
let fetcher: ReturnType<typeof vi.fn>;
let database: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  rows = new Map();
  put = vi.fn(async (url: string, r: Response) => {
    rows.set(url, r.clone());
  });
  vi.stubGlobal('caches', {
    open: vi.fn(async () => ({
      match: async (url: string) => rows.get(url)?.clone(),
      put,
    })),
    match: vi.fn(async () => undefined),
  });
  database = vi.fn(() => {
    throw Error('music storage must remain untouched');
  });
  vi.stubGlobal('indexedDB', { open: database });
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 320;
      naturalHeight = 180;
      onload?: () => void;
      onerror?: () => void;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  fetcher = vi.fn(async () => response());
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('deduplicates image fetches and reloads cached pixels offline without opening music IDB', async () => {
  let art = await import('../src/youtube-artwork');
  const [first, second] = await Promise.all([
    art.ensureYoutubeArtwork(ID),
    art.ensureYoutubeArtwork(ID),
  ]);
  expect(first).toMatch(/^blob:/);
  expect(second).toBe(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(put).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]).toEqual([
    art.thumbnailCandidates(ID)[0],
    expect.objectContaining({
      credentials: 'omit',
      redirect: 'error',
      mode: 'cors',
    }),
  ]);
  vi.resetModules();
  vi.stubGlobal('navigator', { onLine: false });
  art = await import('../src/youtube-artwork');
  expect(await art.ensureYoutubeArtwork(ID)).toMatch(/^blob:/);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(database).not.toHaveBeenCalled();
});

it('uses an older cached hq URL before any network request', async () => {
  const art = await import('../src/youtube-artwork');
  const legacy = response();
  (caches.match as ReturnType<typeof vi.fn>).mockImplementation(
    async (url: string) =>
      url.endsWith('/hqdefault.jpg') ? legacy.clone() : undefined,
  );
  expect(await art.ensureYoutubeArtwork(ID)).toMatch(/^blob:/);
  expect(fetcher).not.toHaveBeenCalled();
  expect(put).not.toHaveBeenCalled();
  expect(database).not.toHaveBeenCalled();
});

it('quota failure still displays decoded artwork', async () => {
  put.mockRejectedValue(new DOMException('full', 'QuotaExceededError'));
  const art = await import('../src/youtube-artwork');
  expect(await art.ensureYoutubeArtwork(ID)).toMatch(/^blob:/);
  expect(database).not.toHaveBeenCalled();
});

it('invalid IDs cannot make requests or open caches', async () => {
  const art = await import('../src/youtube-artwork');
  for (const id of [
    '../secret',
    'https://evil.test/123',
    ID + '?key=secret',
    '',
  ]) {
    expect(await art.ensureYoutubeArtwork(id)).toBe(art.ART_FALLBACK);
    expect(art.thumbnailCandidates(id)).toEqual([]);
  }
  expect(fetcher).not.toHaveBeenCalled();
  expect(caches.open).not.toHaveBeenCalled();
});

it('missing images and undecodable placeholders fall back without caching', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL');
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 120;
      naturalHeight = 90;
      onload?: () => void;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  const art = await import('../src/youtube-artwork');
  expect(await art.ensureYoutubeArtwork(ID)).toBe(art.ART_FALLBACK);
  expect(put).not.toHaveBeenCalled();
  expect(database).not.toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledTimes(3);
});

it('retries a missing offline image on the online event and keeps success deduplicated', async () => {
  const events = new EventTarget();
  vi.stubGlobal('window', events);
  vi.stubGlobal('navigator', { onLine: false });
  const art = await import('../src/youtube-artwork');
  expect(await art.ensureYoutubeArtwork(ID)).toBe(art.ART_FALLBACK);
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubGlobal('navigator', { onLine: true });
  events.dispatchEvent(new Event('online'));
  expect(await art.ensureYoutubeArtwork(ID)).toMatch(/^blob:/);
  events.dispatchEvent(new Event('online'));
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('CORS failure can display an ordinary CDN image without claiming a cached blob', async () => {
  fetcher.mockRejectedValue(new TypeError('CORS'));
  const art = await import('../src/youtube-artwork');
  expect(await art.ensureYoutubeArtwork(ID)).toBe(
    art.thumbnailCandidates(ID)[0],
  );
  expect(put).not.toHaveBeenCalled();
});
