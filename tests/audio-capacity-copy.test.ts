import { it, expect } from 'vitest';
import { AudioJobError } from '../src/external-audio-api';
import { externalError } from '../src/external-errors';
import { AUDIO_STORAGE_FULL } from '../src/audio-storage-full';
it('distinguishes server audio capacity from a browser storage exception in all locales', () => {
  for (const language of Object.keys(
    AUDIO_STORAGE_FULL,
  ) as (keyof typeof AUDIO_STORAGE_FULL)[]) {
    expect(externalError(new AudioJobError('storage_full'), language)).toBe(
      AUDIO_STORAGE_FULL[language],
    );
    expect(
      externalError(new DOMException('Full', 'QuotaExceededError'), language),
    ).not.toBe(AUDIO_STORAGE_FULL[language]);
  }
  expect(AUDIO_STORAGE_FULL.ko).toContain('서버');
  expect(AUDIO_STORAGE_FULL.en).toContain('server');
});
