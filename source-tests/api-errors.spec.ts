import { test, expect } from '@playwright/test';
const base = 'https://orvio-share.pn-26f.workers.dev';
test('audio adapter rejects changed source, wrong digest and expired job without POST', async ({
  page,
}) => {
  let writes = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST') writes++;
  });
  await page.goto('/');
  await page.route(base + '/**', async (route) => {
    const url = route.request().url();
    if (url.endsWith('/audio'))
      return route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        headers: {
          'X-Content-SHA256': 'a'.repeat(64),
          'X-Source-Video-Id': 'uXn-zOt68V8',
          'X-Audio-Contract': 'audio/1',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers':
            'X-Content-SHA256,X-Source-Video-Id,X-Audio-Contract',
        },
        body: Buffer.alloc(44),
      });
    return route.fulfill({
      status: 410,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: { code: 'audio_expired' } }),
    });
  });
  const r = await page.evaluate(async () => {
    const api = await import('/src/external-audio-api.ts');
    const job = {
      jobId: 'example-job',
      status: 'done',
      audio: {
        sha256: 'a'.repeat(64),
        sizeBytes: 44,
        contentType: 'audio/wav',
        durationSec: 1,
        contractVersion: 'audio/1',
        expiresAt: Date.now() + 10000,
      },
    } as any;
    const outcomes = [];
    for (const expected of ['b'.repeat(64), undefined])
      try {
        await api.loadAudio(job, 'uXn-zOt68V8', expected);
        outcomes.push('bad-accepted');
      } catch (e) {
        outcomes.push((e as any).code);
      }
    try {
      await api.readAudioJob('example-job');
    } catch (e) {
      outcomes.push((e as any).code);
    }
    return outcomes;
  });
  expect(r).toEqual(['source_changed', 'integrity_failed', 'audio_expired']);
  expect(writes).toBe(0);
});
test('numeric live expiresAt is accepted and invalid metadata fails closed', async ({
  page,
}) => {
  await page.goto('/');
  let good = true;
  await page.route(base + '/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        jobId: 'example',
        status: 'done',
        audio: {
          sha256: 'a'.repeat(64),
          sizeBytes: 44,
          contentType: 'audio/wav',
          durationSec: 1,
          contractVersion: 'audio/1',
          expiresAt: good ? Date.now() + 10000 : 'nonsense',
        },
      }),
    }),
  );
  const one = await page.evaluate(async () => {
    const api = await import('/src/external-audio-api.ts');
    return (await api.readAudioJob('example')).status;
  });
  expect(one).toBe('done');
  good = false;
  const two = await page.evaluate(async () => {
    const api = await import('/src/external-audio-api.ts');
    try {
      await api.readAudioJob('example');
      return 'bad-accepted';
    } catch (e) {
      return (e as any).code;
    }
  });
  expect(two).toBe('unavailable');
});
