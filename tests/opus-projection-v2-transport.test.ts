import { it, expect } from 'vitest';
import {
  createPrivateOpusV2ProjectionTransport,
  OPUS_PROJECTION_V2_CANDIDATE_ENDPOINT as URL,
} from '../src/opus/opus-projection-v2-transport-private.mjs';
const hash = 'a'.repeat(64),
  q = {
    version: 1,
    requestId: hash,
    videoId: 'AAAAAAAAAAA',
    encodedAudioSha256: hash,
  };
const ok = {
  ...q,
  kind: 'orvio-opus-owner-audio-projection-v2',
  ok: true,
  audioDescriptorSha256: hash,
  audioSha256: hash,
  decoderWasmSha256: hash,
  frames: 48000,
  sampleRate: 48000,
  channels: 2,
  currentAtConfirmation: true,
};
function response(body: any = ok, options: any = {}) {
  const r = new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
      ...options,
    },
  );
  Object.defineProperty(r, 'url', { value: URL });
  return r;
}
it('one fixed read-only exchange binds nonce and roots, no credentials/redirect/retry', async () => {
  let calls = 0;
  const t = createPrivateOpusV2ProjectionTransport({
    fetchImpl: async (url: any, opts: any) => {
      calls++;
      expect(url).toBe(URL);
      expect(opts).toMatchObject({
        method: 'POST',
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        mode: 'cors',
        referrerPolicy: 'no-referrer',
      });
      expect(JSON.parse(opts.body)).toEqual(q);
      return response();
    },
  });
  expect(await t.exchange(q)).toEqual(ok);
  expect(calls).toBe(1);
});
it('strict status/url/content type/size/json/nonce/schema/currentness reject', async () => {
  const bad = [
    () => response(ok, { status: 201 }),
    () => response(ok, { status: 500 }),
    () => {
      const r = response();
      Object.defineProperty(r, 'redirected', { value: true });
      return r;
    },
    () => {
      const r = response();
      Object.defineProperty(r, 'url', { value: 'https://example.invalid' });
      return r;
    },
    () => response(ok, { headers: { 'Content-Type': 'text/html' } }),
    () => response('x'.repeat(2049)),
    () => response('{'),
    () => response({ ...ok, requestId: 'b'.repeat(64) }),
    () => response({ ...ok, extra: true }),
    () => response({ ...ok, currentAtConfirmation: false }),
    () => response({ ...ok, frames: 14400001 }),
    () => response({ ...ok, encodedAudioSha256: 'b'.repeat(64) }),
    () =>
      response(ok, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-transform',
          'X-Content-Type-Options': 'nosniff',
          'Content-Length': '2049',
        },
      }),
  ];
  for (const make of bad) {
    let calls = 0;
    const t = createPrivateOpusV2ProjectionTransport({
      fetchImpl: async () => {
        calls++;
        return make();
      },
    });
    await expect(t.exchange(q)).rejects.toThrow();
    expect(calls).toBe(1);
  }
});
it('only exact deny accepted, invalid requests never fetch', async () => {
  const deny = {
    version: 1,
    kind: ok.kind,
    requestId: hash,
    ok: false,
    error: 'owner_audio_unavailable',
  };
  expect(
    await createPrivateOpusV2ProjectionTransport({
      fetchImpl: async () => response(deny),
    }).exchange(q),
  ).toEqual(deny);
  let calls = 0;
  const t = createPrivateOpusV2ProjectionTransport({
    fetchImpl: async () => {
      calls++;
      return response();
    },
  });
  for (const bad of [
    { ...q, extra: true },
    { ...q, requestId: 'x' },
    { ...q, videoId: 'x' },
  ])
    await expect(t.exchange(bad)).rejects.toThrow('owner_transport_request');
  expect(calls).toBe(0);
});
it('abort settles even fetch ignores signal and late body is cancelled', async () => {
  let resolve: any,
    cancelled = false;
  const c = new AbortController();
  const t = createPrivateOpusV2ProjectionTransport({
    fetchImpl: () => new Promise((r) => (resolve = r)),
  });
  const p = t.exchange(q, { signal: c.signal });
  c.abort(Error('stop'));
  await expect(p).rejects.toThrow('stop');
  resolve({
    body: {
      cancel() {
        cancelled = true;
      },
    },
  });
  await new Promise((r) => setTimeout(r, 0));
  expect(cancelled).toBe(true);
});
it('abort settles stalled body without awaiting hostile cancel', async () => {
  let reading: any;
  const c = new AbortController(),
    r = {
      status: 200,
      ok: true,
      redirected: false,
      url: URL,
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-transform',
        'X-Content-Type-Options': 'nosniff',
      }),
      body: {
        getReader() {
          return {
            read() {
              return new Promise((resolve) => (reading = resolve));
            },
            cancel() {
              return new Promise(() => {});
            },
            releaseLock() {},
          };
        },
      },
    };
  const p = createPrivateOpusV2ProjectionTransport({
    fetchImpl: async () => r,
  }).exchange(q, { signal: c.signal });
  while (!reading) await new Promise((resolve) => setTimeout(resolve, 0));
  c.abort(Error('body stop'));
  await expect(p).rejects.toThrow('body stop');
  reading({ done: true });
});
