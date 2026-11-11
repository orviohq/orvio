import { it, expect, vi, afterEach } from 'vitest';
import { songArt, ART_FALLBACK, thumbnailCandidates } from '../src/song-art';
import { installExternalSource } from '../src/external-catalog';
import type { SourceRecord } from '../src/external-source';
import { ensureYoutubeArtwork } from '../src/youtube-artwork';
afterEach(() => vi.unstubAllGlobals());
function setup(outcomes: { width: number; height: number; error?: boolean }[]) {
  let n = 0;
  vi.stubGlobal('document', new EventTarget());
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('CORS fixture');
    }),
  );
  vi.stubGlobal(
    'Image',
    class {
      referrerPolicy = '';
      naturalWidth = 0;
      naturalHeight = 0;
      onload?: () => void;
      onerror?: () => void;
      set src(_value: string) {
        const r = outcomes[n++] ?? { width: 0, height: 0, error: true };
        this.naturalWidth = r.width;
        this.naturalHeight = r.height;
        queueMicrotask(() => (r.error ? this.onerror?.() : this.onload?.()));
      }
    },
  );
}
function source(videoId: string) {
  return installExternalSource(
    { videoId, audioSha256: 'a'.repeat(64), estimatedBpm: 120 } as SourceRecord,
    'Example',
  ).song.id;
}
it('prefers a real 16:9 high-resolution image without the 4:3 wrapper', async () => {
  setup([{ width: 1280, height: 720 }]);
  const id = source('AAAAAAAAAAA');
  songArt(id);
  await ensureYoutubeArtwork('AAAAAAAAAAA');
  expect(songArt(id)).toContain('/maxresdefault.jpg');
  expect(thumbnailCandidates('AAAAAAAAAAA')[1]).toContain('mqdefault');
});
it('rejects soft404 placeholder pixels and uses the 16:9 medium fallback', async () => {
  setup([
    { width: 120, height: 90 },
    { width: 320, height: 180 },
  ]);
  const id = source('BBBBBBBBBBB');
  songArt(id);
  await ensureYoutubeArtwork('BBBBBBBBBBB');
  expect(songArt(id)).toContain('/mqdefault.jpg');
});
it('uses local fallback if neither original thumbnail can load', async () => {
  setup([
    { width: 0, height: 0, error: true },
    { width: 0, height: 0, error: true },
  ]);
  const id = source('CCCCCCCCCCC');
  songArt(id);
  await ensureYoutubeArtwork('CCCCCCCCCCC');
  expect(songArt(id)).toBe(ART_FALLBACK);
  expect(songArt('first-light')).toBe('/wallpapers/first-light.png');
});
