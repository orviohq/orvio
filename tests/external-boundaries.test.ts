import { it, expect } from 'vitest';
import { youtubeId } from '../src/external-import';
import { validateReplay, validateRuntimeReplay } from '../src/replay';
import { AudioJobError } from '../src/external-audio-api';
import { externalError } from '../src/external-errors';
import { LANGUAGES } from '../src/i18n';
it('recognizes explicit YouTube hosts and rejects misleading domains', () => {
  for (const url of [
    'https://youtu.be/uXn-zOt68V8',
    'https://www.youtube.com/watch?v=uXn-zOt68V8',
    'https://youtube.com/shorts/uXn-zOt68V8',
    'uXn-zOt68V8',
  ])
    expect(youtubeId(url)).toBe('uXn-zOt68V8');
  for (const url of [
    'https://youtube.com.evil.example/watch?v=uXn-zOt68V8',
    'https://evil.example/?v=uXn-zOt68V8',
    'http://youtu.be/uXn-zOt68V8',
    'javascript:alert(1)',
  ])
    expect(youtubeId(url)).toBeNull();
});
it('local runtime validation never widens the public replay decoder', () => {
  const r = {
    version: 1,
    song: 'yt-uXn-zOt68V8-' + 'a'.repeat(16),
    lanes: 7,
    difficulty: 'high',
    options: { speed: 9, fader: 'off', shuffle: 'off', seed: 123 },
    ops: [
      [0, 1, 1, 0, 1],
      [3, 2, 1.1, 7, 'in2'],
    ],
    end: 1000,
  };
  expect(validateReplay(r)).toBeNull();
  expect(validateRuntimeReplay(r, (id) => id === r.song)).toEqual(r);
  expect(
    validateRuntimeReplay({ ...r, ops: [[0, 1, 1, 7, 1]] }, () => true),
  ).toBeNull();
});
it('all locale recovery messages distinguish busy from daily quota and duration bounds', () => {
  for (const lang of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    const busy = externalError(new AudioJobError('unavailable', 30, 429), lang);
    const quota = externalError(
      new AudioJobError('rate_limited', 3600, 429),
      lang,
    );
    expect(busy).toContain('30');
    expect(busy).not.toBe(quota);
    expect(externalError(new AudioJobError('too_long'), lang)).toContain('2');
  }
});
