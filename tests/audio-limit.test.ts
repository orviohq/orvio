import { it, expect, vi } from 'vitest';
import {
  readAudioLimit,
  audioLimitMessage,
  LIMIT_SCOPES,
} from '../src/audio-limit-message';
import { readAudioJob, AudioJobError } from '../src/external-audio-api';
import { externalError } from '../src/external-errors';
import { LANGUAGES } from '../src/i18n';
it('uses only known server scopes and exact finite reset instants', () => {
  for (const scope of LIMIT_SCOPES)
    expect(
      readAudioLimit({ limitScope: scope, resetAtUnixSec: 1794182400 }),
    ).toEqual({ limitScope: scope, resetAtUnixSec: 1794182400 });
  for (const limitScope of ['<script>', 'ip_hour', null])
    expect(
      readAudioLimit({ limitScope, resetAtUnixSec: 1794182400 }),
    ).toBeUndefined();
  for (const resetAtUnixSec of [0, -1, NaN, Infinity, '1794182400', 1.5, 1e15])
    expect(
      readAudioLimit({ limitScope: 'ip_day', resetAtUnixSec }),
    ).toBeUndefined();
});
it('all thirteen languages distinguish all four buckets and show a reset time', () => {
  for (const language of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    const messages = LIMIT_SCOPES.map((limitScope) =>
      audioLimitMessage({ limitScope, resetAtUnixSec: 1794182400 }, language),
    );
    expect(new Set(messages).size).toBe(4);
    for (const text of messages) expect(text.length).toBeGreaterThan(30);
  }
});
it('propagates truth fields from actual 429 shape, not the old flat retry duration', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        error: {
          code: 'rate_limited',
          retryAfterSec: 86400,
          limitScope: 'ip_day',
          resetAtUnixSec: 1794182400,
        },
      }),
      { status: 429 },
    ),
  );
  try {
    await readAudioJob('test-job');
    throw Error('expected limit');
  } catch (error) {
    expect(error).toBeInstanceOf(AudioJobError);
    const e = error as AudioJobError;
    expect(e.limit?.resetAtUnixSec).toBe(1794182400);
    expect(externalError(e, 'ko')).toContain('이 IP의 일일');
    expect(externalError(e, 'ko')).not.toContain('24시간');
  } finally {
    fetch.mockRestore();
  }
});
it('legacy unknown-bucket errors stay honest, nonlimited errors ignore truth fields', () => {
  expect(
    externalError(new AudioJobError('rate_limited', 86400, 429), 'ko'),
  ).toBe('일일 또는 요청 한도에 도달했습니다. 나중에 다시 시도하세요.');
  expect(
    externalError(new AudioJobError('unavailable', 30, 429), 'ko'),
  ).toContain('30초');
});
