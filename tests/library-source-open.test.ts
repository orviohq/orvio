import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  librarySourceAction,
  openSourceInNewTab,
} from '../src/library-source-open';
import { LANGUAGES } from '../src/i18n';
import { attachOpus468Artwork, songVideoId } from '../src/song-art';

it('builds the exact original YouTube URL for a valid video id in all 13 languages', () => {
  expect(Object.keys(LANGUAGES)).toHaveLength(13);
  for (const language of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    expect(librarySourceAction('dQw4w9WgXcQ', language)).toEqual({
      label: expect.any(String),
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
  }
});

it('hides the source action when no valid original video id exists', () => {
  for (const videoId of [
    undefined,
    null,
    '',
    'bad',
    'dQw4w9WgXc!',
    'dQw4w9WgXcQQ',
  ])
    expect(librarySourceAction(videoId, 'ko')).toBeNull();
});

it('uses an imported opus record video id rather than its audio format as source', async () => {
  const record = JSON.parse(
    readFileSync('test-support/opus35-frost/record.json', 'utf8'),
  );
  expect(record.audioFormat).toBe('orvio-opus-v1');
  await attachOpus468Artwork('orv90-opus-source', record);
  expect(songVideoId('orv90-opus-source')).toBe(record.videoId);
  expect(librarySourceAction(songVideoId('orv90-opus-source'), 'ko')).toEqual({
    label: '원곡 열기',
    url: `https://www.youtube.com/watch?v=${record.videoId}`,
  });
});

it('opens a new tab with noopener and noreferrer and clears the opener', () => {
  const calls: unknown[][] = [];
  const opened = { opener: {} } as Window;
  const result = openSourceInNewTab(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    (...args) => {
      calls.push(args);
      return opened;
    },
  );
  expect(calls).toEqual([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '_blank',
      'noopener,noreferrer',
    ],
  ]);
  expect(opened.opener).toBeNull();
  expect(result).toBe(opened);
});
