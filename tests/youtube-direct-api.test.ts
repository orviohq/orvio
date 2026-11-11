import { globalFetchCalls } from "./youtube-direct-bootstrap.ts";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { after, test } from "node:test";
import {
  acquireYoutubeAudio,
  YoutubeDirectApiError,
  YOUTUBE_DIRECT_ORIGIN,
  YOUTUBE_DIRECT_TOTAL_DEADLINE_MS,
  type YoutubeDirectFetch,
} from "../src/youtube-direct-api.ts";
import { makePcm16StereoWav } from "./youtube-direct-fixture.ts";

after(() => assert.equal(globalFetchCalls, 0, "must use injected fetch only"));

const videoId = "unitTest_01";
const publicKey = "unit-only-public-key";
const fixture = makePcm16StereoWav({
  sampleRate: 44100,
  frames: 3,
  samples: [-32768, 32767, -123, 456, 0, 1],
});
const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const code = (expected: string, status?: number) => (error: unknown) => {
  assert.ok(error instanceof YoutubeDirectApiError);
  assert.equal(error.code, expected);
  if (status !== undefined) assert.equal(error.status, status);
  return true;
};
function bodyResponse(bytes: Uint8Array, declared = true) {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        // Split inside the RIFF prefix as well as the PCM data.
        for (const [start, end] of [
          [0, 3],
          [3, 11],
          [11, 45],
          [45, bytes.length],
        ]) {
          controller.enqueue(bytes.subarray(start, end));
        }
        controller.close();
      },
    }),
    { headers: declared ? { "Content-Length": String(bytes.length) } : {} },
  );
}

for (const sampleRate of [44100, 48000] as const) {
  for (const declared of [true, false]) {
    test(`complete ${sampleRate} Hz WAV, declared length ${declared}`, async () => {
      const expected = makePcm16StereoWav({
        sampleRate,
        frames: 3,
        samples: [-32768, 32767, -123, 456, 0, 1],
      });
      let calls = 0;
      const stages: string[] = [];
      const caller = new AbortController();
      let requestSignal: AbortSignal;
      const result = await acquireYoutubeAudio(videoId, {
        publicKey,
        signal: caller.signal,
        onStage: ({ stage }) => stages.push(stage),
        fetch: async (url, init) => {
          calls++;
          assert.equal(
            url,
            `${YOUTUBE_DIRECT_ORIGIN}/v1/videos/${videoId}/audio?format=bestaudio%2Fbest&audio-format=wav`,
          );
          assert.deepEqual(init.headers, {
            Authorization: `Bearer ${publicKey}`,
            Prefer: "wait=15",
          });
          assert.equal(init.method, "GET");
          assert.equal(init.credentials, "omit");
          assert.equal(init.redirect, "error");
          assert.ok(init.signal instanceof AbortSignal);
          requestSignal = init.signal;
          return bodyResponse(expected.bytes, declared);
        },
      });
      assert.equal(calls, 1);
      assert.deepEqual(new Uint8Array(result.bytes), expected.bytes);
      assert.ok(result.bytes instanceof ArrayBuffer);
      assert.equal(result.audioSha256, expected.audioSha256);
      assert.equal(result.sampleRate, sampleRate);
      assert.equal(result.frames, expected.frames);
      assert.equal(result.durationSeconds, expected.durationSeconds);
      assert.equal(stages[0], "request");
      assert.equal(stages.at(-1), "verifying");
      assert.equal(getEventListeners(caller.signal, "abort").length, 0);
      assert.equal(getEventListeners(requestSignal!, "abort").length, 0);
    });
  }
}

test("total deadline settles a fetch that ignores abort and cancels its late body", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000 });
  const caller = new AbortController();
  let signal: AbortSignal;
  let finish!: (response: Response) => void;
  let cancelled = 0;
  let calls = 0;
  const promise = acquireYoutubeAudio(videoId, {
    publicKey,
    signal: caller.signal,
    fetch: (_url, init) => {
      calls++;
      signal = init.signal!;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const rejected = assert.rejects(promise, code("request_timeout"));
  t.mock.timers.tick(YOUTUBE_DIRECT_TOTAL_DEADLINE_MS);
  await rejected;
  assert.equal(signal!.aborted, true);
  assert.equal(getEventListeners(caller.signal, "abort").length, 0);
  assert.equal(getEventListeners(signal!, "abort").length, 0);
  finish(
    new Response(
      new ReadableStream({
        cancel() {
          cancelled++;
        },
      }),
    ),
  );
  await flush();
  assert.equal(cancelled, 1);
  assert.equal(calls, 1);
});

test("total deadline interrupts a real stalled stream even when cancel never settles", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000 });
  let pulled = false;
  let cancelled = 0;
  let signal: AbortSignal;
  const body = new ReadableStream<Uint8Array>({
    pull() {
      pulled = true;
      return new Promise(() => {});
    },
    cancel() {
      cancelled++;
      return new Promise(() => {});
    },
  });
  const promise = acquireYoutubeAudio(videoId, {
    publicKey,
    fetch: async (_url, init) => {
      signal = init.signal!;
      return new Response(body);
    },
  });
  const rejected = assert.rejects(promise, code("request_timeout"));
  await flush();
  assert.equal(pulled, true);
  t.mock.timers.tick(YOUTUBE_DIRECT_TOTAL_DEADLINE_MS);
  await rejected;
  assert.equal(signal!.aborted, true);
  assert.equal(cancelled, 1);
  assert.equal(body.locked, false);
  assert.equal(getEventListeners(signal!, "abort").length, 0);
});

for (const retryAfter of ["45", new Date(46_000).toUTCString()]) {
  test(`202 honors full Retry-After ${retryAfter} on the same URL`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000 });
    const calls: { url: string; at: number }[] = [];
    let cancelled = 0;
    const promise = acquireYoutubeAudio(videoId, {
      publicKey,
      fetch: async (url) => {
        calls.push({ url, at: Date.now() });
        if (calls.length === 1)
          return new Response(
            new ReadableStream({
              cancel() {
                cancelled++;
              },
            }),
            { status: 202, headers: { "Retry-After": retryAfter } },
          );
        return bodyResponse(fixture.bytes);
      },
    });
    await flush();
    assert.equal(cancelled, 1);
    t.mock.timers.tick(44_999);
    await flush();
    assert.equal(calls.length, 1);
    t.mock.timers.tick(1);
    const result = await promise;
    assert.deepEqual(calls, [
      { url: calls[0].url, at: 1_000 },
      { url: calls[0].url, at: 46_000 },
    ]);
    assert.deepEqual(new Uint8Array(result.bytes), fixture.bytes);
  });
}

test("202 wait beyond remaining deadline fails without another request", async () => {
  let calls = 0;
  await assert.rejects(
    acquireYoutubeAudio(videoId, {
      publicKey,
      fetch: async () => {
        calls++;
        return new Response(null, {
          status: 202,
          headers: { "Retry-After": "196" },
        });
      },
    }),
    code("request_timeout", 202),
  );
  assert.equal(calls, 1);
});

for (const [status, expected] of [
  [401, "auth"],
  [429, "rate_limited"],
  [503, "unavailable"],
] as const) {
  test(`${status} cancels the body and never retries`, async () => {
    let cancelled = 0;
    let calls = 0;
    const fetch: YoutubeDirectFetch = async () => {
      calls++;
      return new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
        {
          status,
          headers: { "Retry-After": "45" },
        },
      );
    };
    await assert.rejects(
      acquireYoutubeAudio(videoId, { publicKey, fetch }),
      (error) => {
        code(expected, status)(error);
        if (status === 429)
          assert.equal((error as YoutubeDirectApiError).retryAfterSec, 45);
        return true;
      },
    );
    assert.equal(calls, 1);
    assert.equal(cancelled, 1);
  });
}

test("pre-aborted caller preserves its reason without fetching or adding listeners", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000 });
  const caller = new AbortController();
  const reason = { cancelled: "before request" };
  caller.abort(reason);
  let calls = 0;
  await assert.rejects(
    acquireYoutubeAudio(videoId, {
      publicKey,
      signal: caller.signal,
      fetch: async () => {
        calls++;
        return bodyResponse(fixture.bytes);
      },
    }),
    (error) => error === reason,
  );
  t.mock.timers.tick(YOUTUBE_DIRECT_TOTAL_DEADLINE_MS);
  assert.equal(calls, 0);
  assert.equal(getEventListeners(caller.signal, "abort").length, 0);
});

test("caller abort interrupts an uncooperative fetch and discards its late body", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000 });
  const caller = new AbortController();
  const reason = new Error("cancel fetch");
  let signal: AbortSignal;
  let finish!: (response: Response) => void;
  let calls = 0;
  let cancelled = 0;
  const promise = acquireYoutubeAudio(videoId, {
    publicKey,
    signal: caller.signal,
    fetch: (_url, init) => {
      calls++;
      signal = init.signal!;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const rejected = assert.rejects(promise, (error) => error === reason);
  caller.abort(reason);
  await rejected;
  assert.equal(signal!.reason, reason);
  assert.equal(getEventListeners(caller.signal, "abort").length, 0);
  assert.equal(getEventListeners(signal!, "abort").length, 0);
  finish(
    new Response(
      new ReadableStream({
        cancel() {
          cancelled++;
        },
      }),
    ),
  );
  await flush();
  t.mock.timers.tick(YOUTUBE_DIRECT_TOTAL_DEADLINE_MS);
  assert.equal(cancelled, 1);
  assert.equal(calls, 1);
});

test("caller abort interrupts body reading with reason and listener cleanup", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000 });
  const caller = new AbortController();
  const reason = { cancelled: "body" };
  let signal: AbortSignal;
  let calls = 0;
  let pulled = false;
  let cancelled = 0;
  let cancelReason: unknown;
  const body = new ReadableStream<Uint8Array>({
    pull() {
      pulled = true;
      return new Promise(() => {});
    },
    cancel(value) {
      cancelled++;
      cancelReason = value;
      return new Promise(() => {});
    },
  });
  const promise = acquireYoutubeAudio(videoId, {
    publicKey,
    signal: caller.signal,
    fetch: async (_url, init) => {
      calls++;
      signal = init.signal!;
      return new Response(body);
    },
  });
  const rejected = assert.rejects(promise, (error) => error === reason);
  await flush();
  assert.equal(pulled, true);
  caller.abort(reason);
  await rejected;
  t.mock.timers.tick(YOUTUBE_DIRECT_TOTAL_DEADLINE_MS);
  assert.equal(signal!.reason, reason);
  assert.equal(cancelReason, reason);
  assert.equal(cancelled, 1);
  assert.equal(body.locked, false);
  assert.equal(calls, 1);
  assert.equal(getEventListeners(caller.signal, "abort").length, 0);
  assert.equal(getEventListeners(signal!, "abort").length, 0);
});

test("caller abort during Retry-After wait preserves reason and prevents another fetch", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000 });
  const caller = new AbortController();
  const reason = new Error("cancel wait");
  let signal: AbortSignal;
  let calls = 0;
  let cancelled = 0;
  const stages: string[] = [];
  const promise = acquireYoutubeAudio(videoId, {
    publicKey,
    signal: caller.signal,
    onStage: ({ stage }) => stages.push(stage),
    fetch: async (_url, init) => {
      calls++;
      signal = init.signal!;
      return new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
        {
          status: 202,
          headers: { "Retry-After": "45" },
        },
      );
    },
  });
  const rejected = assert.rejects(promise, (error) => error === reason);
  await flush();
  assert.equal(stages.at(-1), "waiting");
  assert.equal(getEventListeners(signal!, "abort").length, 1);
  caller.abort(reason);
  await rejected;
  t.mock.timers.tick(YOUTUBE_DIRECT_TOTAL_DEADLINE_MS);
  await flush();
  assert.equal(signal!.reason, reason);
  assert.equal(calls, 1);
  assert.equal(cancelled, 1);
  assert.equal(getEventListeners(caller.signal, "abort").length, 0);
  assert.equal(getEventListeners(signal!, "abort").length, 0);
});

// Keep these regression cases independent of the configured download ceiling.
import { AUDIO_MAX_BYTES } from "../src/audio-limits.mjs";

for (const [name, mutate] of [
  [
    "RIFF signature",
    (bytes: Uint8Array) => {
      bytes[0] = 0;
    },
  ],
  [
    "WAVE signature",
    (bytes: Uint8Array) => {
      bytes[8] = 0;
    },
  ],
  [
    "PCM format",
    (bytes: Uint8Array) => {
      new DataView(bytes.buffer).setUint16(20, 3, true);
    },
  ],
  [
    "channel count",
    (bytes: Uint8Array) => {
      new DataView(bytes.buffer).setUint16(22, 1, true);
    },
  ],
  [
    "sample rate",
    (bytes: Uint8Array) => {
      new DataView(bytes.buffer).setUint32(24, 22050, true);
    },
  ],
  [
    "byte rate",
    (bytes: Uint8Array) => {
      new DataView(bytes.buffer).setUint32(28, 1, true);
    },
  ],
  [
    "block alignment",
    (bytes: Uint8Array) => {
      new DataView(bytes.buffer).setUint16(32, 2, true);
    },
  ],
  [
    "bit depth",
    (bytes: Uint8Array) => {
      new DataView(bytes.buffer).setUint16(34, 8, true);
    },
  ],
  [
    "data chunk length",
    (bytes: Uint8Array) => {
      new DataView(bytes.buffer).setUint32(40, 100, true);
    },
  ],
] as const) {
  test(`invalid WAV ${name} fails without another fetch`, async () => {
    const bytes = fixture.bytes.slice();
    mutate(bytes);
    const caller = new AbortController();
    let signal: AbortSignal;
    let calls = 0;
    await assert.rejects(
      acquireYoutubeAudio(videoId, {
        publicKey,
        signal: caller.signal,
        fetch: async (_url, init) => {
          calls++;
          signal = init.signal!;
          return bodyResponse(bytes);
        },
      }),
      code("integrity_failed", 200),
    );
    assert.equal(calls, 1);
    assert.equal(getEventListeners(caller.signal, "abort").length, 0);
    assert.equal(getEventListeners(signal!, "abort").length, 0);
  });
}

test("trailing partial WAV chunk fails despite matching RIFF and Content-Length", async () => {
  const bytes = new Uint8Array(fixture.bytes.length + 1);
  bytes.set(fixture.bytes);
  new DataView(bytes.buffer).setUint32(4, bytes.length - 8, true);
  let calls = 0;
  await assert.rejects(
    acquireYoutubeAudio(videoId, {
      publicKey,
      fetch: async () => {
        calls++;
        return bodyResponse(bytes);
      },
    }),
    code("integrity_failed", 200),
  );
  assert.equal(calls, 1);
});

for (const [length, expected] of [
  [String(AUDIO_MAX_BYTES + 1), "oversize"],
  ["9007199254740993", "oversize"],
  ["43", "integrity_failed"],
  ["-1", "integrity_failed"],
  ["56.5", "integrity_failed"],
  ["invalid", "integrity_failed"],
] as const) {
  test(`invalid Content-Length ${length} cancels the body without another fetch`, async () => {
    let calls = 0;
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled++;
      },
    });
    await assert.rejects(
      acquireYoutubeAudio(videoId, {
        publicKey,
        fetch: async () => {
          calls++;
          return new Response(body, { headers: { "Content-Length": length } });
        },
      }),
      code(expected, 200),
    );
    assert.equal(calls, 1);
    assert.equal(cancelled, 1);
    assert.equal(body.locked, false);
  });
}

for (const source of ["RIFF header", "body"] as const) {
  test(`oversize ${source} cancels the stream without another fetch`, async () => {
    const bytes =
      source === "body"
        ? new Uint8Array(AUDIO_MAX_BYTES + 1)
        : fixture.bytes.slice(0, 12);
    if (source === "RIFF header")
      new DataView(bytes.buffer).setUint32(4, AUDIO_MAX_BYTES - 7, true);
    let calls = 0;
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
      },
      cancel() {
        cancelled++;
      },
    });
    await assert.rejects(
      acquireYoutubeAudio(videoId, {
        publicKey,
        fetch: async () => {
          calls++;
          return new Response(body);
        },
      }),
      code("oversize", 200),
    );
    assert.equal(calls, 1);
    assert.equal(cancelled, 1);
    assert.equal(body.locked, false);
  });
}

for (const mismatch of [
  "declared shorter",
  "declared longer",
  "truncated body",
  "extra body",
  "short prefix",
  "short RIFF",
] as const) {
  test(`length mismatch: ${mismatch} fails without another fetch`, async () => {
    let bytes = fixture.bytes.slice();
    const headers: Record<string, string> = {};
    if (mismatch === "declared shorter")
      headers["Content-Length"] = String(bytes.length - 1);
    if (mismatch === "declared longer")
      headers["Content-Length"] = String(bytes.length + 1);
    if (mismatch === "truncated body") bytes = bytes.slice(0, -1);
    if (mismatch === "extra body") {
      bytes = new Uint8Array(fixture.bytes.length + 1);
      bytes.set(fixture.bytes);
    }
    if (mismatch === "short prefix") bytes = bytes.slice(0, 11);
    if (mismatch === "short RIFF")
      new DataView(bytes.buffer).setUint32(4, 35, true);
    let calls = 0;
    await assert.rejects(
      acquireYoutubeAudio(videoId, {
        publicKey,
        fetch: async () => {
          calls++;
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(bytes.subarray(0, 12));
                controller.enqueue(bytes.subarray(12));
                controller.close();
              },
            }),
            { headers },
          );
        },
      }),
      code("integrity_failed", 200),
    );
    assert.equal(calls, 1);
  });
}

for (const source of ["fetch rejection", "fetch throw", "body"] as const) {
  test(`network error from ${source} cleans listeners without another fetch`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000 });
    const caller = new AbortController();
    const failure = new TypeError("unit transport failure");
    let signal: AbortSignal;
    let calls = 0;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(fixture.bytes.subarray(0, 12));
      },
      pull(controller) {
        controller.error(failure);
      },
    });
    await assert.rejects(
      acquireYoutubeAudio(videoId, {
        publicKey,
        signal: caller.signal,
        fetch: (_url, init) => {
          calls++;
          signal = init.signal!;
          if (source === "fetch throw") throw failure;
          if (source === "fetch rejection") return Promise.reject(failure);
          return Promise.resolve(new Response(body));
        },
      }),
      (error) => {
        code("network_error", source === "body" ? 200 : undefined)(error);
        assert.equal(
          (error as YoutubeDirectApiError).status,
          source === "body" ? 200 : undefined,
        );
        return true;
      },
    );
    t.mock.timers.tick(YOUTUBE_DIRECT_TOTAL_DEADLINE_MS);
    await flush();
    assert.equal(calls, 1);
    assert.equal(signal!.aborted, false);
    assert.equal(body.locked, false);
    assert.equal(getEventListeners(caller.signal, "abort").length, 0);
    assert.equal(getEventListeners(signal!, "abort").length, 0);
  });
}
