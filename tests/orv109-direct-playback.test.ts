import { it, expect, vi } from 'vitest';
import { makePcm16StereoWav } from './youtube-direct-fixture';
import { makeSegments, hash } from '../src/progressive/segments';
import { manifestSha256 } from '../src/progressive/manifest-trust';
import { beginDirectProgressivePlayback, DirectIntegrityError, DirectServiceError } from '../src/progressive/direct-playback';

async function fixture() {
  const { bytes } = makePcm16StereoWav({ sampleRate: 44100, frames: 132300, samples: new Int16Array(264600) });
  const wav = bytes.buffer as ArrayBuffer;
  const generated = await makeSegments(wav, 'abcdefghijk', 2);
  const manifest = { ...generated, parts: generated.parts.map(({ bytes: _b, ...p }: any) => p) };
  const record = {
    videoId: manifest.videoId,
    audioSha256: await hash(wav),
    frames: manifest.frames,
    sampleRate: manifest.sampleRate,
    chartSetSha256: 'b'.repeat(64),
  };
  const pin = { ...record, manifestSha256: await manifestSha256(manifest) };
  const proof = { manifest, pin, verified: { record: { record } } };
  return { manifest, record, pin, wav, proof, providerOrigin: 'https://provider.fixture.invalid', publicKey: 'fixture-public-key' };
}

function partBody(f: Awaited<ReturnType<typeof fixture>>, index: number) {
  const p = f.manifest.parts[index];
  return new Uint8Array(f.wav.slice(p.byteOffset, p.byteOffset + p.byteLength));
}

function makeFetcher(
  f: Awaited<ReturnType<typeof fixture>>,
  opts: {
    etag?: string;
    etagByIndex?: Record<number, string>;
    bodyByIndex?: Record<number, Uint8Array>;
    statusByIndex?: Record<number, number>;
    headersByIndex?: Record<number, Record<string, string>>;
    delayByIndex?: Record<number, () => Promise<void>>;
    onFetch?: (index: number, init?: RequestInit) => void;
  } = {},
) {
  const calls: Array<{ url: string; init?: RequestInit; index: number }> = [];
  let currentEtag = opts.etag ?? '"stable-v1"';
  const fetcher = vi.fn<typeof fetch>(async (url: any, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const range = headers.get('Range') || '';
    const m = /^bytes=(\d+)-(\d+)$/.exec(range);
    if (!m) throw Error('Missing Range');
    const start = Number(m[1]);
    const index = f.manifest.parts.findIndex((p: any) => p.byteOffset === start);
    if (index < 0) throw Error(`Unknown part for range ${range}`);
    calls.push({ url: String(url), init, index });
    opts.onFetch?.(index, init);
    if (opts.delayByIndex?.[index]) await opts.delayByIndex[index]();
    if (index > 0) {
      const expected = opts.etagByIndex?.[index - 1] ?? currentEtag;
      const ifRange = headers.get('If-Range');
      if (ifRange !== expected) throw Error(`Bad If-Range: ${ifRange} != ${expected}`);
    }
    const p = f.manifest.parts[index];
    const body = opts.bodyByIndex?.[index] ?? partBody(f, index);
    const etag = opts.etagByIndex?.[index] ?? currentEtag;
    const status = opts.statusByIndex?.[index] ?? 206;
    const extra = opts.headersByIndex?.[index] ?? {};
    return new Response(body as unknown as BodyInit, {
      status,
      headers: {
        ETag: etag,
        'Content-Range': `bytes ${p.byteOffset}-${p.byteOffset + p.byteLength - 1}/${f.manifest.byteLength}`,
        ...extra,
      },
    });
  });
  return { fetcher, calls };
}

function mockContext() {
  const sources: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
  const ctx: any = {
    currentTime: 0,
    baseLatency: 0.005,
    outputLatency: 0.01,
    state: 'suspended',
    _suspended: true,
    starts: [] as Array<{ when: number; offset: number }>,
    createGain: () => ({ gain: { value: 0, setTargetAtTime() {} }, connect() {} }),
    createBuffer: (ch: number, frames: number, r: number) => ({ numberOfChannels: ch, length: frames, sampleRate: r, copyToChannel() {} }),
    createBufferSource: () => {
      const src: any = {
        buffer: null,
        connect() {},
        start: vi.fn((when: number, offset = 0) => { ctx.starts.push({ when, offset }); }),
        stop: vi.fn(() => {}),
        disconnect() {},
        onended: null,
      };
      sources.push(src);
      return src;
    },
    resume: vi.fn(async () => { ctx._suspended = false; ctx.state = 'running'; }),
    suspend: vi.fn(async () => { ctx._suspended = true; ctx.state = 'suspended'; }),
    close: vi.fn(async () => {}),
    getOutputTimestamp: () => undefined,
    destination: {},
    _sources: sources,
  };
  return ctx;
}

function options(f: Awaited<ReturnType<typeof fixture>>, fetcher: typeof fetch, extra: any = {}) {
  return { providerOrigin: f.providerOrigin, publicKey: f.publicKey, fetcher, ...extra };
}

function expectAbortLike(e: any) {
  return e === 'stopped' || e instanceof Error || typeof e === 'string' || e?.name === 'AbortError';
}

it('valid full run: sequential fetches, ready after first, done equals wav, all segments scheduled in order', async () => {
  const f = await fixture();
  const { fetcher, calls } = makeFetcher(f);
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  await run.ready;
  expect(ctx.starts.length).toBeGreaterThanOrEqual(1);

  const whole = await run.done;
  expect(new Uint8Array(whole)).toEqual(new Uint8Array(f.wav));

  expect(calls.map(c => c.index)).toEqual(f.manifest.parts.map((_: any, i: number) => i));
  for (let i = 0; i < calls.length; i++) {
    const h = new Headers(calls[i].init?.headers);
    const p = f.manifest.parts[i];
    expect(h.get('Range')).toBe(`bytes=${p.byteOffset}-${p.byteOffset + p.byteLength - 1}`);
    if (i === 0) expect(h.get('If-Range')).toBeNull();
    else expect(h.get('If-Range')).toBe('"stable-v1"');
  }
  expect(ctx.starts.length).toBe(f.manifest.parts.length);
}, 20000);

it('ETag drift on part 1 rejects done and schedules nothing from part 1', async () => {
  const f = await fixture();
  // request for part 1 will carry If-Range of part 0 etag; respond with mismatching ETag/content drift via different ETag than requested chain expects
  const { fetcher } = makeFetcher(f, { etagByIndex: { 1: '"drifted-v2"' } });
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  await run.ready; // part 0 scheduled
  expect(ctx.starts.length).toBe(1);
  await expect(run.done).rejects.toThrow();
  expect(ctx.starts.length).toBe(1);
}, 20000);

it('truncated part 0 rejects done, ready never resolves, zero segments scheduled', async () => {
  const f = await fixture();
  const short = partBody(f, 0).slice(0, -1);
  const { fetcher } = makeFetcher(f, { bodyByIndex: { 0: short } });
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  let readyResolved = false;
  void run.ready.then(() => { readyResolved = true; }).catch(() => {});
  await expect(run.done).rejects.toThrow();
  expect(readyResolved).toBe(false);
  expect(ctx.starts.length).toBe(0);
}, 20000);

it('tampered part 0 hash rejects before any audio scheduled (pre-audible)', async () => {
  const f = await fixture();
  const bad = partBody(f, 0);
  bad[45] ^= 1;
  const { fetcher } = makeFetcher(f, { bodyByIndex: { 0: new Uint8Array(bad) } });
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  await expect(run.done).rejects.toThrow();
  expect(ctx.starts.length).toBe(0);
}, 20000);

it('owner abort mid-run rejects done, stops clock, no further fetches, no buffering after stop', async () => {
  const f = await fixture();
  let releasePart1!: () => void;
  const gate = new Promise<void>(r => { releasePart1 = r; });
  const buffering: boolean[] = [];
  const { fetcher, calls } = makeFetcher(f, {
    delayByIndex: { 1: () => gate },
    onFetch: (index) => { if (index === 1) { /* in flight */ } },
  });
  const ctx = mockContext();
  // track stop calls on clock via sources stop and/or spy after creation by wrapping: easier spy on run.clock.stop
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any, { onBuffering: (v: boolean) => buffering.push(v) }));

  await run.ready;
  for (let i = 0; i < 100 && !calls.some(c => c.index === 1); i++) await new Promise(r => setTimeout(r, 0));
  expect(calls.some(c => c.index === 1)).toBe(true);
  const stopSpy = vi.spyOn(run.clock, 'stop');
  ac.abort('owner');
  releasePart1();
  await expect(run.done).rejects.toSatisfy(expectAbortLike);
  expect(stopSpy).toHaveBeenCalled();
  await new Promise(r => setTimeout(r, 20));
  const callsAfter = calls.length;
  await new Promise(r => setTimeout(r, 30));
  expect(calls.length).toBe(callsAfter);
  expect(calls.every(c => c.index <= 1)).toBe(true);
  const stopsAt = buffering.lastIndexOf(false);
  // no buffering toggles after stop: onBuffering not called after stop (best-effort: no new calls)
  const before = buffering.length;
  await new Promise(r => setTimeout(r, 20));
  expect(buffering.length).toBe(before);
}, 20000);

it('terminal gate ordering: done resolves after final schedule and only once when all gates pass', async () => {
  const f = await fixture();
  const { fetcher } = makeFetcher(f);
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  let doneResolved = false;
  let schedulesAtDone = -1;
  run.done.then(() => { doneResolved = true; schedulesAtDone = ctx.starts.length; }).catch(() => {});
  await run.ready;
  // while not done yet, if we observed, we shouldn't see done before final; wait for completion
  const whole = await run.done;
  expect(doneResolved).toBe(true);
  expect(schedulesAtDone).toBe(f.manifest.parts.length);
  expect(ctx.starts.length).toBe(f.manifest.parts.length);
  expect(new Uint8Array(whole)).toEqual(new Uint8Array(f.wav));
  // resolves exactly once: await again returns same
  const whole2 = await run.done;
  expect(whole2).toBe(whole);
}, 20000);

it('late stop after done resolved is safe: no error, no extra fetches, no buffering after stop', async () => {
  const f = await fixture();
  const buffering: boolean[] = [];
  const { fetcher, calls } = makeFetcher(f);
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any, { onBuffering: (v: boolean) => buffering.push(v) }));

  await run.done;
  const count = calls.length;
  const bufCount = buffering.length;
  expect(() => run.stop()).not.toThrow();
  await new Promise(r => setTimeout(r, 30));
  expect(calls.length).toBe(count);
  expect(buffering.length).toBe(bufCount);
}, 20000);

it('OWNER ABORT AFTER DONE SILENCES SCHEDULED AUDIO', async () => {
  const f = await fixture();
  const { fetcher } = makeFetcher(f);
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  await run.done;
  expect(ctx.currentTime).toBe(0);
  expect(ctx._sources.length).toBeGreaterThan(0);

  const stopSpy = vi.spyOn(run.clock, 'stop');
  ac.abort('owner');
  expect(stopSpy).toHaveBeenCalled();
  expect(run.clock.active).toBe(false);
}, 20000);

it('ABORT DURING WHOLE-HASH GATE REJECTS DONE, NEVER PERSISTS', async () => {
  const f = await fixture();
  const { fetcher } = makeFetcher(f);
  const ctx = mockContext();
  const ac = new AbortController();
  const wholeLen = f.wav.byteLength;
  const origDigest = crypto.subtle.digest.bind(crypto.subtle);
  let aborted = false;
  const digestSpy = vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (alg: AlgorithmIdentifier, data: BufferSource) => {
    const buf = data instanceof ArrayBuffer ? data : (data as ArrayBufferView).buffer;
    const byteLength = data instanceof ArrayBuffer ? data.byteLength : (data as ArrayBufferView).byteLength;
    const result = await origDigest(alg, data);
    if (!aborted && byteLength === wholeLen && String(alg).toUpperCase().includes('SHA-256')) {
      aborted = true;
      ac.abort('owner');
    }
    return result;
  });
  try {
    const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));
    await expect(run.done).rejects.toSatisfy(expectAbortLike);
    expect(aborted).toBe(true);
  } finally {
    digestSpy.mockRestore();
  }
}, 20000);

it('OWNER LISTENER CLEANUP: after explicit run.stop(), a later owner abort is a no-op', async () => {
  const f = await fixture();
  const { fetcher } = makeFetcher(f);
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  await run.ready;
  const stopSpy = vi.spyOn(run.clock, 'stop');
  run.stop();
  await expect(run.done).rejects.toSatisfy(expectAbortLike);
  const calls = stopSpy.mock.calls.length;
  expect(calls).toBeGreaterThanOrEqual(1);
  ac.abort('later');
  expect(stopSpy.mock.calls.length).toBe(calls);
}, 20000);

it('OWNER LISTENER CLEANUP: after natural audible end, the owner listener is removed', async () => {
  vi.useFakeTimers();
  try {
    const f = await fixture();
    const { fetcher } = makeFetcher(f);
    const ctx = mockContext();
    const ac = new AbortController();
    const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.1, ac.signal, options(f, fetcher as any));

    await run.done;
    ctx.currentTime = 10;
    await vi.advanceTimersByTimeAsync(10_000);
    const stopSpy = vi.spyOn(run.clock, 'stop');
    ac.abort('later');
    expect(stopSpy).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
}, 20000);

it('PAUSED/FROZEN CLOCK: wall time past original end, owner abort must still silence', async () => {
  vi.useFakeTimers();
  try {
    const f = await fixture();
    const { fetcher } = makeFetcher(f);
    const ctx = mockContext();
    ctx.currentTime = 0;
    const ac = new AbortController();
    const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.1, ac.signal, options(f, fetcher as any));

    await run.done;
    // Simulate paused/frozen context: currentTime stays pinned while wall time passes
    // well beyond the original scheduled audio end (anchor + total duration).
    await vi.advanceTimersByTimeAsync(20_000);
    expect(ctx.currentTime).toBe(0);

    const stopSpy = vi.spyOn(run.clock, 'stop');
    ac.abort('owner');
    expect(stopSpy).toHaveBeenCalled();
    expect(run.clock.active).toBe(false);

    // No dangling timer should keep anything pending after abort/cleanup.
    await vi.runOnlyPendingTimersAsync();
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
}, 20000);

it('CORRUPTED FIRST PART CLASSIFIES AS INTEGRITY', async () => {
  const f = await fixture();
  const bad = new Uint8Array(partBody(f, 0));
  bad[0] ^= 0xff;
  const { fetcher } = makeFetcher(f, { bodyByIndex: { 0: bad } });
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  await expect(run.done).rejects.toBeInstanceOf(DirectIntegrityError);
  await expect(run.ready).rejects.toBeInstanceOf(DirectIntegrityError);
  expect(ctx.starts.length).toBe(0);
}, 20000);

it('TRANSPORT FAILURE CLASSIFIES AS SERVICE', async () => {
  const f = await fixture();
  const { fetcher } = makeFetcher(f);
  fetcher.mockImplementationOnce(() => { throw new TypeError('fetch failed'); });
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(f.proof as any, ctx, 0.5, ac.signal, options(f, fetcher as any));

  const err = await run.done.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(DirectServiceError);
  expect(err).not.toBeInstanceOf(DirectIntegrityError);
  expect((err as Error).message).toBe('Audio service request failed');
}, 20000);

it('WHOLE-GATE MISMATCH CLASSIFIES AS INTEGRITY', async () => {
  const f = await fixture();
  const wrong = 'c'.repeat(64);
  expect(wrong).not.toBe(f.pin.audioSha256);
  const proof = structuredClone(f.proof) as any;
  proof.pin.audioSha256 = wrong;
  proof.verified.record.record.audioSha256 = wrong;
  proof.manifest.audioSha256 = wrong;
  const { fetcher } = makeFetcher(f);
  const ctx = mockContext();
  const ac = new AbortController();
  const run = beginDirectProgressivePlayback(proof, ctx, 0.5, ac.signal, options(f, fetcher as any));

  const err = await run.done.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(DirectIntegrityError);
  expect((err as Error).message).toBe('Whole-file integrity failed');
  expect(ctx.starts.length).toBe(f.manifest.parts.length);
}, 20000);
