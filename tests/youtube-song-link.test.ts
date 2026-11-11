import { it, expect } from 'vitest';
import {
  createYoutubeSongLink,
  parseYoutubeSongInvitation,
  youtubeWatchUrl,
} from '../src/youtube-song-link';

it('creates a short selection link from a valid video id', () => {
  expect(createYoutubeSongLink('dQw4w9WgXcQ', 'https://example.test')).toBe(
    'https://example.test/select/?youtube=dQw4w9WgXcQ',
  );
});

it('handles origins with trailing slashes and paths through the URL API', () => {
  expect(createYoutubeSongLink('dQw4w9WgXcQ', 'https://example.test/')).toBe(
    'https://example.test/select/?youtube=dQw4w9WgXcQ',
  );
  expect(
    createYoutubeSongLink('dQw4w9WgXcQ', 'https://example.test/base'),
  ).toBe('https://example.test/select/?youtube=dQw4w9WgXcQ');
});

it('rejects invalid video ids when creating a link', () => {
  for (const id of ['bad', 'dQw4w9WgXc!', 'dQw4w9WgXcQQ'])
    expect(() => createYoutubeSongLink(id, 'https://example.test')).toThrow();
});

it('parses absent, valid and invalid invitation params', () => {
  expect(parseYoutubeSongInvitation('')).toBeNull();
  expect(parseYoutubeSongInvitation('?song=first-light')).toBeNull();
  expect(parseYoutubeSongInvitation('?youtube=dQw4w9WgXcQ')).toBe(
    'dQw4w9WgXcQ',
  );
  expect(parseYoutubeSongInvitation('?youtube=bad')).toBeNull();
  expect(parseYoutubeSongInvitation('?youtube=dQw4w9WgXc!')).toBeNull();
  expect(parseYoutubeSongInvitation('?youtube=dQw4w9WgXcQQ')).toBeNull();
});

it('rejects a repeated invitation param', () => {
  expect(
    parseYoutubeSongInvitation('?youtube=dQw4w9WgXcQ&youtube=AAAAAAAAAAA'),
  ).toBeNull();
});

it('keeps unrelated params irrelevant while returning the valid id', () => {
  expect(
    parseYoutubeSongInvitation(
      '?foo=bar&youtube=dQw4w9WgXcQ&lanes=5&difficulty=low',
    ),
  ).toBe('dQw4w9WgXcQ');
});

it('returns the public YouTube watch URL', () => {
  expect(youtubeWatchUrl('dQw4w9WgXcQ')).toBe(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  );
});
