import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  beginTrace,
  endTrace,
  traceSpan,
  readTraces,
  resetTracesForTests,
} from '../src/import-trace';

// Controlled transport only: every network and persistence dependency is
// stubbed or mocked. No real request, POST, provider run, or IndexedDB.

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('import-trace recorder', () => {
  beforeEach(() => resetTracesForTests());

  it('records spans in order with monotonic relative clocks', async () => {
    const trace = beginTrace();
    await traceSpan(trace, 'a', () => sleep(5));
    await traceSpan(trace, 'b', () => sleep(1));
    endTrace(trace, 'ok');
    const [out] = readTraces();
    expect(out.outcome).toBe('ok');
    expect(out.totalMs).toBeGreaterThanOrEqual(5);
    const ats = out.events.map((e) => e.atMs);
    expect(ats).toEqual([...ats].sort((x, y) => x - y));
    expect(out.events.map((e) => e.stage)).toEqual([
      'a:begin',
      'a:end',
      'b:begin',
      'b:end',
    ]);
    const a = out.events.find((e) => e.stage === 'a:end');
    expect(typeof a?.ms).toBe('number');
    expect(a!.ms as number).toBeGreaterThanOrEqual(4);
  });

  it('records :error with measured ms and rethrows', async () => {
    const trace = beginTrace();
    await expect(
      traceSpan(trace, 'boom', async () => {
        await sleep(3);
        throw new DOMException('Aborted', 'AbortError');
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    endTrace(trace, 'error:AbortError');
    const [out] = readTraces();
    const err = out.events.find((e) => e.stage === 'boom:error');
    expect(err?.error).toBe('AbortError');
    expect(err!.ms as number).toBeGreaterThanOrEqual(2);
    expect(out.events.some((e) => e.stage === 'boom:end')).toBe(false);
  });

  it('tolerates a null trace and still runs the work', async () => {
    const result = await traceSpan(null, 'x', async () => 42);
    expect(result).toBe(42);
    expect(readTraces()).toEqual([]);
  });

  it('gives concurrent imports independent traces and caps actives', async () => {
    const t1 = beginTrace();
    const t2 = beginTrace();
    const t3 = beginTrace();
    const t4 = beginTrace();
    expect(beginTrace()).toBeNull();
    await Promise.all([
      traceSpan(t1, 'one', () => sleep(6)),
      traceSpan(t2, 'two', () => sleep(2)),
    ]);
    endTrace(t1, 'ok');
    endTrace(t2, 'ok');
    endTrace(t3, 'ok');
    endTrace(t4, 'ok');
    const out = readTraces();
    const byId = new Map(out.map((t) => [t.id, t]));
    expect(out).toHaveLength(4);
    for (const t of out) {
      const stages = t.events.map((e) => e.stage);
      const own = stages.filter(
        (s) => s.startsWith('one') || s.startsWith('two'),
      );
      // each trace carries exactly one import's spans
      expect(
        own.every((s) => s.startsWith('one')) ||
          own.every((s) => s.startsWith('two')) ||
          own.length === 0,
      ).toBe(true);
    }
    expect(byId.get(t1!.id)!.events.some((e) => e.stage === 'one:begin')).toBe(
      true,
    );
    expect(byId.get(t2!.id)!.events.some((e) => e.stage === 'two:begin')).toBe(
      true,
    );
  });

  it('collapses attacker-controlled error names to the fixed allowlist', async () => {
    const trace = beginTrace();
    const secretName = 'BearerSECRET_probe_videoId_http://x';
    const probe = new Error('probe');
    probe.name = secretName;
    await expect(
      traceSpan(trace, 'p1', async () => {
        throw probe;
      }),
    ).rejects.toBe(probe);
    await expect(
      traceSpan(trace, 'p2', async () => {
        throw new DOMException('probe', secretName);
      }),
    ).rejects.toBeDefined();
    await expect(
      traceSpan(trace, 'p3', async () => {
        throw new DOMException('Aborted', 'AbortError');
      }),
    ).rejects.toBeDefined();
    endTrace(trace, 'error');
    const events = readTraces()[0].events;
    const serialized = JSON.stringify(readTraces());
    expect(serialized).not.toContain(secretName);
    expect(serialized).not.toContain('BearerSECRET');
    expect(events.find((e) => e.stage === 'p1:error')?.error).toBe('Error');
    expect(events.find((e) => e.stage === 'p2:error')?.error).toBe('Error');
    expect(events.find((e) => e.stage === 'p3:error')?.error).toBe(
      'AbortError',
    );
  });

  it('never records identifiers, URLs, or tokens in the payload', async () => {
    const trace = beginTrace();
    await traceSpan(trace, 'job-poll-get', () => sleep(1), {
      poll: 1,
      status: 200,
      retryAfterSec: 3,
    });
    endTrace(trace, 'ok');
    const serialized = JSON.stringify(readTraces());
    expect(serialized).not.toMatch(/https?:/i);
    expect(serialized).not.toMatch(/youtube|youtu\.be/i);
    expect(serialized).not.toMatch(/token|bearer|authorization/i);
    expect(serialized).not.toContain('Priv4cyVid0');
  });
});

describe('canonicalForJob controlled transport', () => {
  beforeEach(() => {
    resetTracesForTests();
    vi.resetModules();
  });
  afterEach(() => vi.restoreAllMocks());

  const HASH = 'ab'.repeat(32);
  const doneJob = {
    jobId: 'jobfixture0001',
    status: 'done' as const,
    audio: {
      sha256: HASH,
      sizeBytes: 176400,
      durationSec: 2,
      contentType: 'audio/wav',
      contractVersion: 'audio/1' as const,
      expiresAt: null,
    },
    canonical: { status: 'generating' as const, retryAfterSec: 1 },
  };
  const record = { audioSha256: HASH };

  async function loadModule(canonicalStates: unknown[]) {
    vi.doMock('../src/canonical-source-api', () => ({
      readCanonicalSource: vi.fn(async () => canonicalStates.shift()),
    }));
    vi.doMock('../src/canonical-library', () => ({
      rememberCanonical: vi.fn(async () => undefined),
    }));
    vi.doMock('../src/external-audio-api', () => ({
      readAudioJob: vi.fn(async () => ({ ...doneJob })),
      AudioJobError: class AudioJobError extends Error {
        constructor(
          public code: string,
          public retryAfterSec?: number,
          public status?: number,
          public limit?: unknown,
          public stage?: string,
        ) {
          super(code);
        }
      },
    }));
    return import('../src/canonical-job');
  }

  it('separates canonical GET spans from wait spans and finishes on ready', async () => {
    const { canonicalForJob } = await loadModule([
      { state: 'missing', retryAfterSec: 1 },
      { state: 'ready', record, recordSha256: 'rs' },
    ]);
    const trace = beginTrace();
    const started = performance.now();
    const out = await canonicalForJob(
      'fixturevideo1',
      { ...doneJob },
      undefined,
      undefined,
      trace,
    );
    endTrace(trace, 'ok');
    expect(out).toEqual(record);
    const events = readTraces()[0].events;
    const stages = events.map((e) => e.stage);
    expect(stages).toEqual([
      'canonical-get:begin',
      'canonical-get:end',
      'canonical-job-get:begin',
      'canonical-job-get:end',
      'canonical-wait:begin',
      'canonical-wait:end',
      'canonical-get:begin',
      'canonical-get:end',
      'canonical-idb:begin',
      'canonical-idb:end',
    ]);
    const wait = events.find((e) => e.stage === 'canonical-wait:end');
    expect(wait!.waitMs).toBe(1000);
    // measured wait, not asserted schedule: allow timer slack
    expect(wait!.ms as number).toBeGreaterThanOrEqual(950);
    expect(performance.now() - started).toBeGreaterThanOrEqual(950);
    // wait spans and GET spans never overlap
    const spanOf = (name: string) => {
      const b = events.find((e) => e.stage === name + ':begin')!.atMs;
      const e = events.find((ev) => ev.stage === name + ':end')!.atMs;
      return [b, e] as const;
    };
    const [wb, we] = spanOf('canonical-wait');
    for (const name of ['canonical-job-get']) {
      const [gb, ge] = spanOf(name);
      expect(ge <= wb || gb >= we).toBe(true);
    }
  });

  it('abort during a canonical wait records the wait as aborted, not finished', async () => {
    const { canonicalForJob } = await loadModule([
      { state: 'missing', retryAfterSec: 30 },
      { state: 'ready', record, recordSha256: 'rs' },
    ]);
    const trace = beginTrace();
    const controller = new AbortController();
    const pending = canonicalForJob(
      'fixturevideo1',
      { ...doneJob, canonical: { status: 'generating', retryAfterSec: 30 } },
      controller.signal,
      undefined,
      trace,
    );
    await sleep(500); // first GET + job GET (~ms each) + into the 30s wait
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    endTrace(trace, 'error:AbortError');
    const events = readTraces()[0].events;
    const aborted = events.find((e) => e.stage === 'canonical-wait:error');
    expect(aborted).toBeDefined();
    // aborted wait measured well under the full 30s schedule
    expect(aborted!.ms as number).toBeLessThan(29000);
    expect(events.some((e) => e.stage === 'canonical-wait:end')).toBe(false);
    expect(events.some((e) => e.stage.startsWith('canonical-idb'))).toBe(false);
  });
});

describe('importYoutube outer-catch outcome privacy', () => {
  beforeEach(() => {
    resetTracesForTests();
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock('../src/prepare-local-job');
    vi.doUnmock('../src/local-generated-library');
    vi.doUnmock('../src/canonical-audio-api');
    vi.doUnmock('../src/external-audio-api');
    vi.doUnmock('../src/canonical-library');
    vi.doUnmock('../src/external-local');
    vi.doUnmock('../src/external-source-flow');
    vi.restoreAllMocks();
  });

  const PROBE = 'BearerSECRET_probe_videoId_http://x';

  async function loadModule(thrower: () => never) {
    vi.doMock('../src/prepare-local-job', () => ({
      prepareClientJob: vi.fn(),
    }));
    vi.doMock('../src/local-generated-library', () => ({
      savedLocalGenerated: vi.fn(async () => null),
    }));
    vi.doMock('../src/canonical-audio-api', () => ({
      loadCanonicalAudio: vi.fn(),
      loadRetainedAudio: vi.fn(),
    }));
    vi.doMock('../src/external-audio-api', () => {
      class AudioJobError extends Error {
        constructor(
          public code: string,
          public retryAfterSec?: number,
          public status?: number,
          public limit?: unknown,
          public stage?: string,
        ) {
          super(code);
        }
      }
      const CODES = [
        'invalid_url',
        'too_long',
        'rate_limited',
        'region_blocked',
        'unavailable',
        'not_found',
        'audio_expired',
        'storage_full',
        'source_changed',
        'integrity_failed',
        'unsupported_format',
        'client_audio_not_cached',
        'client_generation_disabled',
        'network_error',
        'request_timeout',
      ];
      return {
        AudioJobError,
        createAudioJob: vi.fn(),
        readAudioJob: vi.fn(),
        validAudioErrorCode: (v: unknown) =>
          typeof v === 'string' && CODES.includes(v),
      };
    });
    vi.doMock('../src/canonical-library', () => ({
      refreshCanonical: vi.fn(async () => thrower()),
    }));
    vi.doMock('../src/external-local', () => ({
      localAudio: vi.fn(),
      saveLocalAudio: vi.fn(),
      localMetadata: vi.fn(),
    }));
    vi.doMock('../src/external-source-flow', () => ({
      prepareExternalJob: vi.fn(),
    }));
    const trace = await import('../src/import-trace');
    trace.resetTracesForTests();
    const mod = await import('../src/external-import');
    return { ...mod, trace };
  }

  it('custom DOMException name never reaches the outcome', async () => {
    const { importYoutube, trace } = await loadModule(() => {
      throw new DOMException('probe', PROBE);
    });
    await expect(
      importYoutube('dQw4w9WgXcQ', new AbortController().signal),
    ).rejects.toBeDefined();
    const [out] = trace.readTraces();
    expect(JSON.stringify(trace.readTraces())).not.toContain('BearerSECRET');
    expect(out.outcome).toBe('error:Error');
  });

  it('arbitrary abort-reason values never reach the outcome', async () => {
    const { importYoutube, trace } = await loadModule(() => {
      throw PROBE; // AbortSignal.reason can be any value
    });
    await expect(
      importYoutube('dQw4w9WgXcQ', new AbortController().signal),
    ).rejects.toBeDefined();
    expect(JSON.stringify(trace.readTraces())).not.toContain('BearerSECRET');
    expect(trace.readTraces()[0].outcome).toBe('error:Error');
  });

  it('server-supplied arbitrary error codes never reach the outcome', async () => {
    const { importYoutube, trace } = await loadModule(() => {
      throw new (class extends Error {
        code = PROBE;
      })('probe');
    });
    await expect(
      importYoutube('dQw4w9WgXcQ', new AbortController().signal),
    ).rejects.toBeDefined();
    expect(JSON.stringify(trace.readTraces())).not.toContain('BearerSECRET');
    expect(trace.readTraces()[0].outcome).toBe('error:Error');
  });

  it('throwing getters and proxies cannot replace the thrown object', async () => {
    const evil = Object.create(null);
    Object.defineProperty(evil, 'code', {
      get() {
        throw new Error('getter-boom');
      },
    });
    Object.defineProperty(evil, 'name', {
      get() {
        throw new Error('getter-boom');
      },
    });
    const { importYoutube, traceOutcome, trace } = await loadModule(() => {
      throw evil;
    });
    // original object identity preserved end to end
    await expect(
      importYoutube('dQw4w9WgXcQ', new AbortController().signal),
    ).rejects.toBe(evil);
    expect(trace.readTraces()[0].outcome).toBe('error:Error');
    expect(traceOutcome(evil)).toBe('error:Error');
    const proxy = new Proxy(
      {},
      {
        get() {
          throw new Error('proxy-boom');
        },
        getPrototypeOf() {
          throw new Error('proxy-boom');
        },
      },
    );
    expect(traceOutcome(proxy)).toBe('error:Error');
    // Error subclass with a throwing name getter
    class EvilError extends Error {
      get name(): string {
        throw new Error('getter-boom');
      }
    }
    expect(traceOutcome(new EvilError('probe'))).toBe('error:Error');
  });

  it('known codes and platform names still appear', async () => {
    const { importYoutube, traceOutcome, trace } = await loadModule(() => {
      throw new DOMException('Aborted', 'AbortError');
    });
    await expect(
      importYoutube('dQw4w9WgXcQ', new AbortController().signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(trace.readTraces()[0].outcome).toBe('error:AbortError');
    expect(traceOutcome(new DOMException('x', 'TimeoutError'))).toBe(
      'error:TimeoutError',
    );
    // invalid URL path throws a fixed-code AudioJobError before any stub
    await expect(
      importYoutube(
        'https://example.com/watch?v=nope',
        new AbortController().signal,
      ),
    ).rejects.toBeDefined();
    expect(trace.readTraces()[1].outcome).toBe('error:invalid_url');
  });
});

describe('loadAudio controlled transport', () => {
  beforeEach(() => {
    resetTracesForTests();
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const HASH_HEX = async (bytes: Uint8Array) =>
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer),
      ),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');

  function wavResponse(bytes: Uint8Array, hash: string, videoId: string) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // two chunks so the body-read loop iterates
        controller.enqueue(bytes.slice(0, 1024));
        controller.enqueue(bytes.slice(1024));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        'X-Content-SHA256': hash,
        'X-Source-Video-Id': videoId,
        'X-Audio-Contract': 'audio/1',
        'Content-Type': 'audio/wav',
      },
    });
  }

  async function loadModule(fetchImpl: typeof fetch) {
    vi.doUnmock('../src/canonical-source-api');
    vi.doUnmock('../src/canonical-library');
    vi.doUnmock('../src/external-audio-api');
    vi.stubGlobal('fetch', vi.fn(fetchImpl));
    vi.doMock('../src/query-client', () => ({
      queryClient: {
        fetchQuery: async (opts: {
          queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown>;
        }) => opts.queryFn({ signal: new AbortController().signal }),
      },
      queryKeys: {
        audioJob: (id: string) => ['audio-job', id],
        audioJobBytes: (id: string, hash: string) => ['audio-bytes', id, hash],
      },
      runMutation: async (_key: unknown, fn: () => Promise<unknown>) => fn(),
    }));
    return import('../src/external-audio-api');
  }

  it('decomposes TTFB, body read, and digest with no overlap claims', async () => {
    const videoId = 'Priv4cyVid0';
    const bytes = new Uint8Array(4096).map((_, i) => i % 251);
    const hash = await HASH_HEX(bytes);
    const { loadAudio } = await loadModule(async () =>
      wavResponse(bytes, hash, videoId),
    );
    const trace = beginTrace();
    const job = {
      jobId: 'jobfixture0002',
      status: 'done' as const,
      audio: {
        sha256: hash,
        sizeBytes: bytes.byteLength,
        durationSec: 2,
        contentType: 'audio/wav',
        contractVersion: 'audio/1' as const,
        expiresAt: null,
      },
    };
    const out = await loadAudio(job, videoId, hash, undefined, trace);
    endTrace(trace, 'ok');
    expect(out.byteLength).toBe(bytes.byteLength);
    const events = readTraces()[0].events;
    const stages = events.map((e) => e.stage);
    expect(stages).toEqual([
      'audio-get-ttfb:begin',
      'audio-get-ttfb:end',
      'audio-body-read:begin',
      'audio-body-read',
      'audio-digest:begin',
      'audio-digest:end',
    ]);
    const ttfb = events.find((e) => e.stage === 'audio-get-ttfb:end');
    expect(ttfb!.status).toBe(200);
    expect(ttfb!.attempt).toBe(1);
    const body = events.find((e) => e.stage === 'audio-body-read');
    expect(body!.bytes).toBe(bytes.byteLength);
    expect(body!.ms as number).toBeGreaterThanOrEqual(0);
    // privacy: payload carries no URL or video id
    const serialized = JSON.stringify(readTraces());
    expect(serialized).not.toContain(videoId);
    expect(serialized).not.toMatch(/https?:/i);
  });

  it('records a 409 retry wait distinctly from request spans', async () => {
    const videoId = 'Priv4cyVid0';
    const bytes = new Uint8Array(2048).map((_, i) => i % 241);
    const hash = await HASH_HEX(bytes);
    let calls = 0;
    const { loadAudio } = await loadModule(async () => {
      calls++;
      if (calls === 1)
        return new Response(
          JSON.stringify({ error: { code: 'unavailable', retryAfterSec: 1 } }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        );
      return wavResponse(bytes, hash, videoId);
    });
    const trace = beginTrace();
    const job = {
      jobId: 'jobfixture0003',
      status: 'done' as const,
      audio: {
        sha256: hash,
        sizeBytes: bytes.byteLength,
        durationSec: 2,
        contentType: 'audio/wav',
        contractVersion: 'audio/1' as const,
        expiresAt: null,
      },
    };
    await loadAudio(job, videoId, hash, undefined, trace);
    endTrace(trace, 'ok');
    const events = readTraces()[0].events;
    const stages = events.map((e) => e.stage);
    expect(stages).toEqual([
      'audio-get-ttfb:begin',
      'audio-get-ttfb:end',
      'audio-retry-wait:begin',
      'audio-retry-wait:end',
      'audio-get-ttfb:begin',
      'audio-get-ttfb:end',
      'audio-body-read:begin',
      'audio-body-read',
      'audio-digest:begin',
      'audio-digest:end',
    ]);
    const retry = events.find((e) => e.stage === 'audio-retry-wait:end');
    expect(retry!.retrySec).toBe(1);
    expect(retry!.ms as number).toBeGreaterThanOrEqual(950);
    const attempts = events.filter((e) => e.stage === 'audio-get-ttfb:end');
    expect(attempts.map((a) => a.attempt)).toEqual([1, 2]);
    expect(attempts.map((a) => a.status)).toEqual([409, 200]);
  });

  it('abort during body read surfaces without fabricated completion', async () => {
    const videoId = 'Priv4cyVid0';
    const bytes = new Uint8Array(2048);
    const hash = await HASH_HEX(bytes);
    const { loadAudio } = await loadModule(async (_url, init) => {
      const reqSignal = init?.signal;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, 512));
          // never closes on its own: the abort must end the read
          reqSignal?.addEventListener('abort', () =>
            controller.error(
              reqSignal.reason ?? new DOMException('Aborted', 'AbortError'),
            ),
          );
        },
      });
      return new Response(stream, {
        status: 200,
        headers: {
          'X-Content-SHA256': hash,
          'X-Source-Video-Id': videoId,
          'X-Audio-Contract': 'audio/1',
          'Content-Type': 'audio/wav',
        },
      });
    });
    const trace = beginTrace();
    const controller = new AbortController();
    const job = {
      jobId: 'jobfixture0004',
      status: 'done' as const,
      audio: {
        sha256: hash,
        sizeBytes: bytes.byteLength,
        durationSec: 2,
        contentType: 'audio/wav',
        contractVersion: 'audio/1' as const,
        expiresAt: null,
      },
    };
    const pending = loadAudio(job, videoId, hash, controller.signal, trace);
    await sleep(50);
    controller.abort();
    await expect(pending).rejects.toBeDefined();
    endTrace(trace, 'error:AbortError');
    const events = readTraces()[0].events;
    expect(events.some((e) => e.stage === 'audio-body-read')).toBe(false);
    expect(events.some((e) => e.stage === 'audio-digest:end')).toBe(false);
    expect(events.some((e) => e.stage === 'audio-get-ttfb:end')).toBe(true);
  });
});
