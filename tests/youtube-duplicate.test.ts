import { describe, expect, it } from 'vitest';
import { youtubeId } from '../src/external-import';
import { youtubeDuplicateState } from '../src/youtube-duplicate';
import { youtubeDuplicateMessage } from '../src/youtube-duplicate-labels';
import { LANGUAGES, type Language } from '../src/i18n';

const video = 'uXn-zOt68V8';
const actualId = `yt-${video}-1234567890abcdef-cfedcba0987654321`;
const songs = [{ id: 'first-light' }, { id: actualId }];
const lookup = (id: string) => (id === actualId ? video : undefined);

describe('duplicate YouTube Add identity', () => {
  it.each([
    video,
    `https://www.youtube.com/watch?v=${video}&list=PLexample&t=32`,
    `https://youtube.com/watch?feature=shared&v=${video}`,
    `https://m.youtube.com/watch?v=${video}`,
    `https://youtu.be/${video}?si=share&t=5`,
    `https://www.youtube.com/shorts/${video}?feature=share`,
    `https://www.youtube.com/live/${video}?si=share`,
    `https://www.youtube.com/embed/${video}?start=5`,
  ])('resolves %s to the exact preferred existing source', (url) => {
    const id = youtubeId(url);
    expect(id).toBe(video);
    expect(youtubeDuplicateState(id!, actualId, songs, lookup, false)).toBe(
      'added',
    );
  });

  it('never mistakes a built-in or stale preferred ID for YouTube ownership', () => {
    expect(
      youtubeDuplicateState(video, 'first-light', songs, lookup, false),
    ).toBeUndefined();
    expect(
      youtubeDuplicateState(
        video,
        actualId,
        [{ id: 'first-light' }],
        lookup,
        false,
      ),
    ).toBeUndefined();
    expect(
      youtubeDuplicateState('AAAAAAAAAAA', actualId, songs, lookup, false),
    ).toBeUndefined();
    expect(
      youtubeDuplicateState(
        video,
        video,
        [{ id: video }],
        () => undefined,
        false,
      ),
    ).toBeUndefined();
  });

  it('distinguishes in-flight/queued from complete, and permits failed retries', () => {
    expect(youtubeDuplicateState(video, undefined, songs, lookup, true)).toBe(
      'adding',
    );
    expect(youtubeDuplicateState(video, actualId, songs, lookup, true)).toBe(
      'added',
    );
    expect(
      youtubeDuplicateState(video, undefined, songs, lookup, false),
    ).toBeUndefined();
  });

  it.each([
    `https://youtube.com.evil.example/watch?v=${video}`,
    `https://example.org/watch?v=${video}`,
    'https://youtu.be/too-short',
    `https://youtu.be/${video}extra`,
  ])('rejects unrelated/malformed URL %s', (url) => {
    expect(youtubeId(url)).toBeNull();
  });

  it('has distinct localized completion and in-flight messages for every language', () => {
    for (const language of Object.keys(LANGUAGES) as Language[]) {
      expect(youtubeDuplicateMessage(language, false)).toBeTruthy();
      expect(youtubeDuplicateMessage(language, true)).not.toBe(
        youtubeDuplicateMessage(language, false),
      );
    }
    expect(youtubeDuplicateMessage('ko', false)).toBe('이미 추가된 곡입니다');
  });
});
