// @ts-nocheck
import { playProgressive } from '../src/progressive/driver';
import { AudioJobError } from '../src/external-audio-api';
import { makeSegments, validateManifest } from '../src/progressive/segments';
import { manifestSha256 } from '../src/progressive/manifest-trust';
import { it, expect } from 'vitest';
import { progressiveFixture } from './progressive-fixture';
it('ported independent driver qualification', async () => {
  const ab = (await progressiveFixture(32)).buffer;
  const m = await makeSegments(ab, 'uXn-zOt68V8');
  const record = {
    videoId: m.videoId,
    audioSha256: m.audioSha256,
    sampleRate: m.sampleRate,
    frames: m.frames,
  };
  const boundPin = {
    videoId: m.videoId,
    audioSha256: m.audioSha256,
    manifestSha256: await manifestSha256(m),
  };
  const oldPin = { videoId: m.videoId, audioSha256: m.audioSha256 };
  let checks = 0;
  const ok = (x, name) => {
    if (!x) throw Error('FAIL ' + name);
    checks++;
  };
  const mockClock = () => ({
    scheduled: [],
    frozen: false,
    stopped: false,
    scheduleSegment(s) {
      this.scheduled.push(s.startFrame);
    },
    guard: async () => false,
    resumeFromFreeze: async () => {},
    stop() {
      this.stopped = true;
    },
  });

  function mockResponse({
    status = 200,
    headers = {},
    bodyBytes = null,
    json = null,
  } = {}) {
    const h = new Headers({
      'Content-Length': String(m.byteLength),
      'X-Content-SHA256': m.audioSha256,
      'X-Canonical-Audio-SHA256': m.audioSha256,
      'X-Source-Video-Id': m.videoId,
      'X-Audio-Contract': 'audio/1',
      'Content-Type': 'audio/wav',
      ...headers,
    });
    const bytes = bodyBytes ?? new Uint8Array(ab);
    return {
      status,
      headers: h,
      json: async () => json,
      body: bytes
        ? new ReadableStream({
            start(c) {
              for (let o = 0; o < bytes.byteLength; o += 99991)
                c.enqueue(
                  bytes.subarray(o, Math.min(o + 99991, bytes.byteLength)),
                );
              c.close();
            },
          })
        : null,
    };
  }
  const failCode = async (p) => {
    try {
      await p;
      return null;
    } catch (e) {
      return e.code ?? String(e);
    }
  };

  // 1. old record default: deferred-whole, terminal gate decides, no segments scheduled
  {
    const clock = mockClock();
    const r = await playProgressive({
      record,
      pin: oldPin,
      manifest: m,
      response: mockResponse(),
      clock,
    });
    ok(
      r.mode === 'deferred-whole' && r.verified && r.binding === 'unverified',
      '1 deferred-whole old record',
    );
    ok(clock.scheduled.length === 0, '1 no early scheduling in deferred mode');
  }
  // 2. bound pin: progressive, all 63 segments scheduled in order, verified
  {
    const clock = mockClock();
    const r = await playProgressive({
      record,
      pin: boundPin,
      manifest: m,
      response: mockResponse(),
      clock,
    });
    ok(
      r.mode === 'progressive' && r.binding === 'verified' && r.verified,
      '2 progressive bound',
    );
    ok(
      clock.scheduled.length === m.parts.length && clock.scheduled[0] === 0,
      '2 all segments scheduled',
    );
    ok(
      typeof r.firstSegmentAt === 'number' && r.firstSegmentAt >= 0,
      '2 first-segment measured',
    );
  }
  // 3. status 410 typed JSON -> audio_expired (checked BEFORE any body read)
  ok(
    (await failCode(
      playProgressive({
        record,
        pin: boundPin,
        manifest: m,
        response: mockResponse({
          status: 410,
          json: { error: 'audio_expired' },
          bodyBytes: null,
        }),
        clock: mockClock(),
      }),
    )) === 'audio_expired',
    '3 410 typed mapping',
  );
  // 4. missing canonical header -> integrity_failed (early path had this gap)
  ok(
    (await failCode(
      playProgressive({
        record,
        pin: boundPin,
        manifest: m,
        response: mockResponse({ headers: { 'X-Audio-Contract': 'audio/2' } }),
        clock: mockClock(),
      }),
    )) === 'integrity_failed',
    '4 wrong contract header rejected',
  );
  // 5. Content-Length vs manifest.byteLength mismatch -> integrity_failed
  ok(
    (await failCode(
      playProgressive({
        record,
        pin: boundPin,
        manifest: m,
        response: mockResponse({
          headers: { 'Content-Length': String(m.byteLength + 1) },
        }),
        clock: mockClock(),
      }),
    )) === 'integrity_failed',
    '5 length/manifest mismatch rejected',
  );
  // 6. deferred branch truncation -> integrity_failed (bounded read, no arrayBuffer)
  {
    const trunc = new Uint8Array(ab).subarray(0, m.byteLength - 500);
    ok(
      (await failCode(
        playProgressive({
          record,
          pin: oldPin,
          manifest: m,
          response: mockResponse({ bodyBytes: trunc }),
          clock: mockClock(),
        }),
      )) === 'integrity_failed',
      '6 deferred truncation rejected',
    );
  }
  // 7. unvalidated manifest geometry rejected BEFORE clock use
  {
    const bad = structuredClone(m);
    bad.parts = bad.parts.slice(1); // coverage gap
    const clock = mockClock();
    const code = await failCode(
      playProgressive({
        record,
        pin: boundPin,
        manifest: bad,
        response: mockResponse(),
        clock,
      }),
    );
    ok(
      String(code).includes('Invalid coverage') || code === 'integrity_failed',
      '7 geometry gap rejected pre-clock',
    );
    ok(clock.scheduled.length === 0, '7 nothing scheduled');
  }
  // 8. manifest identity mismatch vs frozen record -> throws
  {
    const other = structuredClone(m);
    other.videoId = 'BBBBBBBBBBB';
    ok(
      (await failCode(
        playProgressive({
          record,
          pin: boundPin,
          manifest: other,
          response: mockResponse(),
          clock: mockClock(),
        }),
      )) !== null,
      '8 identity mismatch rejected',
    );
  }
  // 9. corrupt segment mid-stream (progressive) -> integrity abort, partial scheduling only
  {
    const evil = new Uint8Array(ab.slice(0));
    evil[m.parts[10].byteOffset + 7] ^= 1;
    const clock = mockClock();
    ok(
      (await failCode(
        playProgressive({
          record,
          pin: boundPin,
          manifest: m,
          response: mockResponse({ bodyBytes: evil }),
          clock,
        }),
      )) === 'integrity_failed',
      '9 corrupt segment aborts',
    );
    ok(
      clock.scheduled.length === 10,
      '9 exactly pre-corruption segments scheduled',
    );
  }
  // 10. old record + explicit allowUnverifiedEarly -> progressive but flagged unverified
  {
    const clock = mockClock();
    const r = await playProgressive({
      record,
      pin: oldPin,
      manifest: m,
      response: mockResponse(),
      clock,
      allowUnverifiedEarly: true,
    });
    ok(
      r.mode === 'progressive' && r.binding === 'unverified' && r.verified,
      '10 explicit unverified-early still terminal-gated',
    );
  }
  // 11. abort signal mid-stream (deferred) -> abort propagates
  {
    const ac = new AbortController();
    const slow = {
      status: 200,
      headers: mockResponse().headers,
      json: async () => null,
      body: new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(100));
          ac.signal.addEventListener('abort', () => c.error(ac.signal.reason)); // models fetch signal semantics
        },
      }),
    };
    setTimeout(() => ac.abort(new DOMException('Aborted', 'AbortError')), 20);
    const code = await failCode(
      playProgressive({
        record,
        pin: oldPin,
        manifest: m,
        response: slow,
        clock: mockClock(),
        signal: ac.signal,
      }),
    );
    ok(
      code !== null && code !== 'integrity_failed',
      '11 abort propagates as abort, not integrity',
    );
  }
  // 12. corrupt segment -> clock.stop() silences already-scheduled audio
  {
    const evil = new Uint8Array(ab.slice(0));
    evil[m.parts[10].byteOffset + 7] ^= 1;
    const clock = mockClock();
    await failCode(
      playProgressive({
        record,
        pin: boundPin,
        manifest: m,
        response: mockResponse({ bodyBytes: evil }),
        clock,
      }),
    );
    ok(
      clock.stopped === true,
      '12 integrity failure silences early-scheduled audio',
    );
  }
  // 13. terminal gate failure after ALL segments scheduled (unverified-early,
  //     attacker manifest+audio consistent pair) -> stop() before throw
  {
    const evil = new Uint8Array(ab.slice(0));
    evil[m.parts[0].byteOffset + 44] ^= 1;
    const evilM = await makeSegments(evil.buffer, 'uXn-zOt68V8');
    evilM.audioSha256 = m.audioSha256; // lying identity field: claims the real audio hash
    const clock = mockClock();
    const resp = mockResponse({
      bodyBytes: evil,
      headers: { 'Content-Length': String(evil.byteLength) },
    });
    const code = await failCode(
      playProgressive({
        record,
        pin: oldPin,
        manifest: evilM,
        response: resp,
        clock,
        allowUnverifiedEarly: true,
      }),
    );
    ok(code === 'integrity_failed', '13 terminal gate rejects attacker pair');
    ok(clock.stopped === true, '13 terminal failure silences audio');
    ok(
      clock.scheduled.length === m.parts.length,
      '13 all segments had sounded pre-gate (unverified mode)',
    );
  }
  // 14. hung reader + abort in sliceStream path settles with abort, reader cancelled
  {
    const ac = new AbortController();
    let cancelled = false;
    // Real ReadableStream semantics: cancel() settles a pending read as done.
    let pendingRead = null;
    const hangBody = {
      getReader: () => ({
        read: () =>
          new Promise((res) => {
            pendingRead = res;
          }),
        cancel: async () => {
          cancelled = true;
          pendingRead?.({ value: undefined, done: true });
        },
      }),
    };
    const slow = {
      status: 200,
      headers: mockResponse().headers,
      json: async () => null,
      body: hangBody,
    };
    setTimeout(() => ac.abort(new DOMException('Aborted', 'AbortError')), 20);
    const code = await failCode(
      playProgressive({
        record,
        pin: boundPin,
        manifest: m,
        response: slow,
        clock: mockClock(),
        signal: ac.signal,
      }),
    );
    ok(
      code !== null && code !== 'integrity_failed',
      '14 hung progressive read settles on abort',
    );
    ok(cancelled === true, '14 reader cancel called on abort');
  }
  // 15. hung reader + abort in deferred readBounded path settles with abort
  {
    const ac = new AbortController();
    let cancelled = false;
    // Real ReadableStream semantics: cancel() settles a pending read as done.
    let pendingRead = null;
    const hangBody = {
      getReader: () => ({
        read: () =>
          new Promise((res) => {
            pendingRead = res;
          }),
        cancel: async () => {
          cancelled = true;
          pendingRead?.({ value: undefined, done: true });
        },
      }),
    };
    const slow = {
      status: 200,
      headers: mockResponse().headers,
      json: async () => null,
      body: hangBody,
    };
    setTimeout(() => ac.abort(new DOMException('Aborted', 'AbortError')), 20);
    const code = await failCode(
      playProgressive({
        record,
        pin: oldPin,
        manifest: m,
        response: slow,
        clock: mockClock(),
        signal: ac.signal,
      }),
    );
    ok(
      code !== null && code !== 'integrity_failed',
      '15 hung deferred read settles on abort',
    );
    ok(cancelled === true, '15 deferred reader cancel called');
  }
  // 16. guard policy failure -> driver REJECTS deterministically with the
  //     guard error, reader cancelled, clock stopped, scheduling halted
  {
    const guardError = new AudioJobError(
      'unavailable',
      undefined,
      undefined,
      undefined,
      'service',
    );
    guardError.message = 'suspend failed';
    const clock = mockClock();
    clock.guard = async () => {
      throw guardError;
    };
    // Stream delivers the first chunks, then pends until cancelled.
    let cancelled = false;
    let pendingRead = null;
    const u8 = new Uint8Array(ab);
    let fed = 0;
    const body = {
      getReader: () => ({
        read: () => {
          if (fed < 3) {
            const o = fed * 99991;
            fed++;
            return Promise.resolve({
              value: u8.subarray(o, o + 99991),
              done: false,
            });
          }
          return new Promise((res) => {
            pendingRead = res;
          });
        },
        cancel: async () => {
          cancelled = true;
          pendingRead?.({ value: undefined, done: true });
        },
      }),
    };
    const resp = {
      status: 200,
      headers: mockResponse().headers,
      json: async () => null,
      body,
    };
    const err = await playProgressive({
      record,
      pin: boundPin,
      manifest: m,
      response: resp,
      clock,
    }).then(
      () => null,
      (e) => e,
    );
    ok(err === guardError, '16 driver rejects with the guard error itself');
    ok(cancelled === true, '16 reader cancelled on guard failure');
    ok(clock.stopped === true, '16 clock stopped on guard failure');
    const scheduledAtFailure = clock.scheduled.length;
    await new Promise((r) => setTimeout(r, 120)); // several guard ticks later
    ok(
      clock.scheduled.length === scheduledAtFailure,
      '16 no scheduling continues after guard failure',
    );
  }
  // 17. guard failure BEFORE any segment still stops the clock (nothing sounded)
  {
    const guardError = new Error('suspend failed early');
    const clock = mockClock();
    clock.guard = async () => {
      throw guardError;
    };
    const slow = {
      status: 200,
      headers: mockResponse().headers,
      json: async () => null,
      body: {
        getReader: () => ({
          read: () =>
            new Promise((res) => {
              setTimeout(() => res({ value: undefined, done: true }), 200);
            }),
          cancel: async () => {},
        }),
      },
    };
    const err = await playProgressive({
      record,
      pin: boundPin,
      manifest: m,
      response: slow,
      clock,
    }).then(
      () => null,
      (e) => e,
    );
    ok(
      err === guardError,
      '17 pre-segment guard failure rejects with guard error',
    );
    ok(clock.stopped === true, '17 clock stopped even with zero scheduled');
  }
  // 18. TOCTOU: guard rejects DURING the async segment verify -> no source
  //     scheduled after stop, driver rejects with the guard error
  {
    const guardError = new Error('suspend failed mid-verify');
    const clock = mockClock();
    clock.guard = async () => {
      throw guardError;
    };
    // Single 24MB segment: the SHA verify window is long enough that a 1ms
    // guard tick lands inside it deterministically.
    clock.waitForGuard = async () => {
      await new Promise((r) => setTimeout(r, 5));
    };
    const whole = await makeSegments(ab, 'uXn-zOt68V8', 200);
    ok(whole.parts.length === 1, '18 single-segment manifest');
    const pin1 = {
      videoId: whole.videoId,
      audioSha256: whole.audioSha256,
      manifestSha256: await manifestSha256(whole),
    };
    const resp = mockResponse({
      headers: { 'Content-Length': String(m.byteLength) },
    });
    const err = await playProgressive({
      record,
      pin: pin1,
      manifest: whole,
      response: resp,
      clock,
      guardIntervalMs: 1,
    }).then(
      () => null,
      (e) => e,
    );
    ok(err === guardError, '18 rejects with guard error');
    ok(clock.stopped === true, '18 clock stopped by guard failure');
    ok(
      clock.scheduled.length === 0,
      '18 NO source scheduled after stop (TOCTOU closed)',
    );
  }
  console.log(
    'PASS',
    checks,
    'driver fail-closed + lifecycle + guard-fatal checks',
  );

  expect(checks).toBe(34);
}, 20000);
