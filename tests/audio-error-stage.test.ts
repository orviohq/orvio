import { it, expect, vi, afterEach } from 'vitest';
import { audioAtStage } from '../src/audio-error-stage';
import { AudioJobError, readAudioJob } from '../src/external-audio-api';
import { externalError } from '../src/external-errors';
import { LANGUAGES, type Language } from '../src/i18n';
afterEach(() => vi.unstubAllGlobals());
it('separates actual service error response from invalid protocol with same public unavailable code', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 'unavailable' } }), {
          status: 503,
        }),
    ),
  );
  await expect(readAudioJob('known-job')).rejects.toMatchObject({
    code: 'unavailable',
    stage: 'service',
    status: 503,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ jobId: 'known-job', status: 'done', audio: {} }),
        ),
    ),
  );
  await expect(readAudioJob('known-job')).rejects.toMatchObject({
    code: 'unavailable',
    stage: 'response',
  });
});
it('only assigns observed local boundary, preserves typed facts and timeout/abort', async () => {
  for (const stage of ['analysis', 'storage'] as const) {
    await expect(
      audioAtStage(stage, async () => {
        throw Error('private diagnostic never displayed');
      }),
    ).rejects.toMatchObject({ code: 'unavailable', stage });
  }
  const typed = new AudioJobError('integrity_failed');
  await expect(
    audioAtStage('analysis', async () => {
      throw typed;
    }),
  ).rejects.toBe(typed);
  const server = new AudioJobError(
    'unavailable',
    undefined,
    503,
    undefined,
    'service',
  );
  await expect(
    audioAtStage('analysis', async () => {
      throw server;
    }),
  ).rejects.toBe(server);
  const abort = new DOMException('cancelled', 'AbortError');
  await expect(
    audioAtStage('analysis', async () => {
      throw abort;
    }),
  ).rejects.toBe(abort);
});
it('all 13 locales distinguish service/response/analysis/storage/unknown without turning unknown into YouTube diagnosis', () => {
  for (const language of Object.keys(LANGUAGES) as Language[]) {
    const labels = [
      'service',
      'response',
      'analysis',
      'storage',
      undefined,
    ].map((stage) =>
      externalError(
        new AudioJobError(
          'unavailable',
          undefined,
          undefined,
          undefined,
          stage as any,
        ),
        language,
      ),
    );
    expect(new Set(labels).size).toBe(5);
    expect(labels.every((s) => s.length > 15 && !s.includes('YouTube'))).toBe(
      true,
    );
    expect(externalError(Error('private error'), language)).toBe(labels[4]);
  }
  expect(
    externalError(
      new AudioJobError(
        'unavailable',
        undefined,
        undefined,
        undefined,
        'analysis',
      ),
      'ko',
    ),
  ).toContain('브라우저에서 음원 분석');
  expect(
    externalError(
      new AudioJobError(
        'unavailable',
        undefined,
        undefined,
        undefined,
        'storage',
      ),
      'ko',
    ),
  ).toContain('읽거나 저장');
});
