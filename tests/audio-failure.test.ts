import { it, expect, vi } from 'vitest';
import { LANGUAGES } from '../src/i18n';
import { externalError } from '../src/external-errors';
import { AudioJobError, readAudioJob } from '../src/external-audio-api';
it('distinguishes typed causes and gives a remedy in all thirteen languages', () => {
  for (const lang of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    const codes = [
      'unavailable',
      'region_blocked',
      'not_found',
      'unsupported_format',
      'integrity_failed',
      'network_error',
      'request_timeout',
    ] as const;
    const messages = codes.map((code) =>
      externalError(new AudioJobError(code), lang),
    );
    expect(new Set(messages).size).toBe(codes.length);
    messages.forEach((text) =>
      expect((text.match(/[.!。]/g) ?? []).length).toBeGreaterThanOrEqual(2),
    );
  }
  expect(externalError(new AudioJobError('unavailable'), 'ko')).toContain(
    '구체적인 원인을 알려주지',
  );
  expect(externalError(new Error('unknown'), 'ko')).not.toContain('지역 제한');
});
it('marks only failed fetches as network failures, leaving aborts unchanged', async () => {
  const mock = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
  try {
    await expect(readAudioJob('job')).rejects.toMatchObject({
      code: 'network_error',
    });
    await expect(readAudioJob('job')).rejects.toMatchObject({
      name: 'AbortError',
    });
  } finally {
    mock.mockRestore();
  }
});
