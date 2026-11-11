import { it, expect, vi, afterEach } from 'vitest';
const catalog = vi.hoisted(() => ({
  sources: new Map<string, { record: { videoId: string } }>(),
}));
vi.mock('../src/external-catalog', () => ({
  externalSource: (id: string) => catalog.sources.get(id),
}));
import { songVideoId } from '../src/song-art';
import { pendingImportRowVisible } from '../src/library-pending-imports';
afterEach(() => catalog.sources.clear());
function completedSong(id: string, videoId: string) {
  catalog.sources.set(id, { record: { videoId } });
  return { id };
}
it('a pending import never duplicates a completed card, while a different error row still renders', () => {
  const songs = [
    completedSong('yt-AAAAAAAAAAA-1111111111111111', 'AAAAAAAAAAA'),
  ];
  const renderedVideoIds = new Set(
    songs
      .map((song) => songVideoId(song.id))
      .filter((videoId): videoId is string => !!videoId),
  );
  const pending = [
    { videoId: 'AAAAAAAAAAA', state: 'loading' },
    { videoId: 'BBBBBBBBBBB', state: 'error' },
  ];
  const cards = [
    ...songs.map((song) => ({
      videoId: songVideoId(song.id),
      completed: true,
    })),
    ...pending
      .filter((row) =>
        pendingImportRowVisible(row.videoId, new Set(), renderedVideoIds),
      )
      .map((row) => ({ videoId: row.videoId, state: row.state })),
  ];
  expect(cards.filter((card) => card.videoId === 'AAAAAAAAAAA')).toEqual([
    { videoId: 'AAAAAAAAAAA', completed: true },
  ]);
  expect(cards).toContainEqual({
    videoId: 'BBBBBBBBBBB',
    state: 'error',
  });
});
it('hidden pending imports keep their existing hidden behavior', () => {
  expect(
    pendingImportRowVisible(
      'AAAAAAAAAAA',
      new Set(['yt:AAAAAAAAAAA']),
      new Set(),
    ),
  ).toBe(false);
  expect(pendingImportRowVisible('AAAAAAAAAAA', new Set(), new Set())).toBe(
    true,
  );
});
