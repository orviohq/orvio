import { it, expect, vi, afterEach } from 'vitest';
import {
  createAudioJob,
  readAudioJob,
  AudioJobError,
} from '../src/external-audio-api';
import { queryClient } from '../src/query-client';
import { externalError } from '../src/external-errors';
import { LANGUAGES } from '../src/i18n';
afterEach(() => {
  queryClient.clear();
  vi.unstubAllGlobals();
});
for (const [status, code] of [
  [409, 'client_audio_not_cached'],
  [503, 'client_generation_disabled'],
] as const)
  it(`nested ${status} ${code} rejects once without server-mode fallback`, async () => {
    const f = vi.fn(async (_input: string, _init: RequestInit) =>
      Response.json({ error: { code } }, { status }),
    );
    vi.stubGlobal('fetch', f);
    await expect(
      createAudioJob(
        'https://youtu.be/AAAAAAAAAAA',
        new AbortController().signal,
        'client',
      ),
    ).rejects.toMatchObject({ code, status, stage: 'service' });
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(f.mock.calls[0][1].body))).toEqual({
      youtubeUrl: 'https://youtu.be/AAAAAAAAAAA',
      generationMode: 'client',
    });
    for (const language of Object.keys(
      LANGUAGES,
    ) as (keyof typeof LANGUAGES)[]) {
      const text = externalError(
        new AudioJobError(code, undefined, status, undefined, 'service'),
        language,
      );
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/client_|generationMode|409|503/);
    }
  });
it('cached-only successful admission keeps client mode in the one explicit POST', async () => {
  const f = vi.fn(async (_input: string, _init: RequestInit) =>
    Response.json(
      { jobId: 'cachedJob', status: 'queued', generationMode: 'client' },
      { status: 201 },
    ),
  );
  vi.stubGlobal('fetch', f);
  const job = await createAudioJob(
    'https://youtu.be/AAAAAAAAAAA',
    undefined,
    'client',
  );
  expect(job.generationMode).toBe('client');
  expect(f).toHaveBeenCalledTimes(1);
});
it('flag-off nested poll failure rejects immediately with one GET and no POST or retry', async () => {
  const f = vi.fn(async (_input: string, _init: RequestInit) =>
    Response.json(
      { error: { code: 'client_generation_disabled' } },
      { status: 503 },
    ),
  );
  vi.stubGlobal('fetch', f);
  await expect(
    readAudioJob('cachedJob', new AbortController().signal),
  ).rejects.toMatchObject({ code: 'client_generation_disabled', status: 503 });
  expect(f).toHaveBeenCalledTimes(1);
  expect(f.mock.calls[0][0]).toContain('/v1/audio-jobs/cachedJob');
  expect(f.mock.calls[0][1].method).toBeUndefined();
});
