import { it, expect } from 'vitest';
import { privateOpus468ResultUrl } from '../src/opus/opus468-result-url';
const song = 'yt-opus-WGm2-exact';
it('failed save has no fabricated result/session reload route', () => {
  for (const key of [undefined, song, 'other-song:session']) {
    const u = new URL(
      privateOpus468ResultUrl(
        song,
        key,
        'https://example.invalid',
        '/select/?song=' + song,
      ),
    );
    expect(u.pathname).toBe('/select/');
    expect(u.searchParams.has('local')).toBe(false);
  }
});
it('only saved exact-song session produces local result link', () => {
  const key = song + ':550e8400-e29b-41d4-a716-446655440000';
  const u = new URL(
    privateOpus468ResultUrl(song, key, 'https://example.invalid', '/select/'),
  );
  expect(u.pathname).toBe('/result/');
  expect(u.searchParams.get('local')).toBe(key);
});
