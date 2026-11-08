import { it, expect, vi, afterEach } from 'vitest';
import {
  readAudioJob,
  createAudioJob,
  AudioJobError,
} from '../src/external-audio-api';
import { externalError } from '../src/external-errors';
import { AUDIO_STORAGE_FULL } from '../src/audio-storage-full';
import { LANGUAGES } from '../src/i18n';
afterEach(() => vi.unstubAllGlobals());
it('accepts explicit durable null or positive legacy expiry, rejects ambiguous missing/invalid expiry', async () => {
  const job = {
    jobId: 'job',
    status: 'done',
    audio: {
      sha256: 'a'.repeat(64),
      sizeBytes: 192044,
      contentType: 'audio/wav',
      durationSec: 1,
      contractVersion: 'audio/1',
      expiresAt: null,
    },
  };
  for (const expiresAt of [null, 1900000000000]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ ...job, audio: { ...job.audio, expiresAt } }),
          ),
      ),
    );
    expect((await readAudioJob('job')).audio?.expiresAt).toBe(expiresAt);
  }
  for (const expiresAt of [undefined, 0, -1, 'forever']) {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ ...job, audio: { ...job.audio, expiresAt } }),
          ),
      ),
    );
    await expect(readAudioJob('job')).rejects.toMatchObject({
      code: 'unavailable',
      stage: 'response',
    });
  }
});
it('storage_full stays typed without fake retry/reset/quota and sends one explicit normal POST only', async () => {
  const fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: 'storage_full',
          capacity: {
            budgetBytes: 400000000,
            usedBytes: 380000000,
            reserveBytes: 57800000,
          },
        }),
        { status: 503 },
      ),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(
    createAudioJob('https://www.youtube.com/watch?v=1-xGerv5FOk'),
  ).rejects.toMatchObject({
    code: 'storage_full',
    status: 503,
    retryAfterSec: undefined,
    limit: undefined,
    stage: 'service',
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('all thirteen languages distinguish storage full from expiry and unknown service failure', () => {
  for (const language of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    const text = externalError(
      new AudioJobError('storage_full', undefined, 503),
      language,
    );
    expect(text).toBe(AUDIO_STORAGE_FULL[language]);
    expect(text.length).toBeGreaterThan(25);
    expect(text).not.toBe(
      externalError(new AudioJobError('audio_expired'), language),
    );
    expect(text).not.toBe(
      externalError(new AudioJobError('unavailable'), language),
    );
  }
});
