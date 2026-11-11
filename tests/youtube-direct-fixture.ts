import { createHash } from "node:crypto";

/** SHA-256 of the actual supplied bytes, never a canned API digest. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Canonical 44-byte RIFF/WAVE header followed by interleaved signed PCM16. */
export function makePcm16StereoWav(options: {
  sampleRate: 44100 | 48000;
  frames: number;
  samples?: ArrayLike<number>;
}) {
  const { sampleRate, frames, samples } = options;
  if (sampleRate !== 44100 && sampleRate !== 48000) {
    throw new RangeError("Unsupported fixture sample rate");
  }
  const byteLength = 44 + frames * 4;
  if (!Number.isSafeInteger(frames) || frames < 0 || byteLength > 48_000_000) {
    throw new RangeError("Fixture must fit within 48 MB");
  }
  if (samples && samples.length !== frames * 2) {
    throw new RangeError("Expected two interleaved samples per frame");
  }
  const bytes = new Uint8Array(byteLength);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      bytes[offset + i] = value.charCodeAt(i);
    }
  };
  text(0, "RIFF");
  view.setUint32(4, byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, frames * 4, true);
  if (samples) {
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      if (!Number.isInteger(sample) || sample < -32768 || sample > 32767) {
        throw new RangeError("Samples must be signed PCM16 integers");
      }
      view.setInt16(44 + i * 2, sample, true);
    }
  }
  return {
    bytes,
    audioSha256: sha256Hex(bytes),
    sampleRate,
    frames,
    durationSeconds: frames / sampleRate,
  };
}

export interface StreamResponseFixture {
  /** Delay before fetch resolves with headers. */
  responseDelayMs?: number;
  /** Each delay starts when the stream pulls that chunk. */
  chunks: readonly { bytes: Uint8Array; delayMs?: number }[];
  status?: number;
  headers?: HeadersInit;
}

/** Synthetic transport only: callers explicitly supply every response byte. */
export function makeStreamFetch(fixture: StreamResponseFixture): typeof fetch {
  const delays = [
    fixture.responseDelayMs,
    ...fixture.chunks.map((c) => c.delayMs),
  ];
  if (
    delays.some((ms) => ms !== undefined && (!Number.isFinite(ms) || ms < 0))
  ) {
    throw new RangeError("Fixture delays must be finite and nonnegative");
  }
  return async (input, init) => {
    const signal =
      init?.signal !== undefined
        ? init.signal
        : input instanceof Request
          ? input.signal
          : undefined;
    const lifetime = new AbortController();
    const abort = () => lifetime.abort(signal?.reason);
    const cleanup = () => signal?.removeEventListener("abort", abort);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    try {
      await delay(fixture.responseDelayMs ?? 0, lifetime.signal);
      lifetime.signal.throwIfAborted();
      let index = 0;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          lifetime.signal.addEventListener(
            "abort",
            () => {
              controller.error(lifetime.signal.reason);
              cleanup();
            },
            { once: true },
          );
        },
        async pull(controller) {
          try {
            const chunk = fixture.chunks[index++];
            if (chunk) {
              await delay(chunk.delayMs ?? 0, lifetime.signal);
              lifetime.signal.throwIfAborted();
              controller.enqueue(chunk.bytes);
            }
            if (index >= fixture.chunks.length) {
              controller.close();
              cleanup();
            }
          } catch (error) {
            controller.error(error);
            cleanup();
          }
        },
        cancel(reason) {
          cleanup();
          lifetime.abort(reason);
        },
      });
      return new Response(body, {
        status: fixture.status ?? 200,
        headers: fixture.headers,
      });
    } catch (error) {
      cleanup();
      lifetime.abort(error);
      throw error;
    }
  };
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);
  if (ms === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
