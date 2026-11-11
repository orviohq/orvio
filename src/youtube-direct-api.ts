import { AUDIO_MAX_BYTES, AUDIO_MAX_SECONDS } from "./audio-limits.mjs";
import { inspectWav } from "./canonical-pcm.mjs";

/** Supplied privately at build time. Never store a deployment host here. */
export const YOUTUBE_DIRECT_ORIGIN = import.meta.env?.PUBLIC_YOUTUBE_API_ORIGIN ??
  (typeof process !== "undefined" ? process.env.PUBLIC_YOUTUBE_API_ORIGIN : undefined) ?? "";
export function configuredYoutubeOrigin(): string {
  let provider: URL;
  try { provider = new URL(YOUTUBE_DIRECT_ORIGIN); } catch { throw new YoutubeDirectApiError("unavailable"); }
  if (provider.protocol !== "https:" || provider.username || provider.password || provider.pathname !== "/" || provider.search || provider.hash)
    throw new YoutubeDirectApiError("unavailable");
  return provider.origin;
}

export const YOUTUBE_DIRECT_TOTAL_DEADLINE_MS = 90_000;
export const YOUTUBE_DIRECT_ABSOLUTE_DEADLINE_MS = 195000;
/** @deprecated Compatibility export only; server Retry-After is never capped. */
export const YOUTUBE_DIRECT_MAX_RETRY_WAIT_MS = 30_000;

const DEFAULT_RETRY_AFTER_MS = 1_000;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type YoutubeDirectErrorCode =
  | "invalid_video_id"
  | "auth"
  | "rate_limited"
  | "unavailable"
  | "network_error"
  | "request_timeout"
  | "aborted"
  | "integrity_failed"
  | "oversize";

export class YoutubeDirectApiError extends Error {
  constructor(
    readonly code: YoutubeDirectErrorCode,
    readonly status?: number,
    readonly retryAfterSec?: number,
  ) {
    super(code);
    this.name = "YoutubeDirectApiError";
  }
}

export type YoutubeDirectStage =
  "request" | "waiting" | "downloading" | "verifying";

export interface YoutubeDirectStageEvent {
  stage: YoutubeDirectStage;
  attempt: number;
  status?: number;
  retryAfterSec?: number;
  bytes?: number;
}

export type YoutubeDirectFetch = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

export interface AcquireYoutubeAudioOptions {
  publicKey: string;
  signal?: AbortSignal;
  onStage?: (event: YoutubeDirectStageEvent) => void;
  fetch?: YoutubeDirectFetch;
}

export interface AcquiredYoutubeAudio {
  bytes: ArrayBuffer;
  audioSha256: string;
  sampleRate: number;
  frames: number;
  durationSeconds: number;
}

// Each asynchronous operation is raced explicitly: injected fetch implementations
// and stream sources are not required to cooperate with AbortSignal.
function interruptible<T>(
  pending: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    pending.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) reject(signal.reason);
        else resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(signal.aborted ? signal.reason : error);
      },
    );
    if (signal.aborted) {
      signal.removeEventListener("abort", abort);
      abort();
    }
  });
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

function retryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    // An enormous wait must time out, never fall back to a shorter default.
    return seconds;
  }
  const at = Date.parse(trimmed);
  if (!Number.isFinite(at)) return undefined;
  return Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

function declaredLength(response: Response): number | undefined {
  const raw = response.headers.get("Content-Length");
  if (raw === null) return undefined;
  if (!/^\d+$/.test(raw))
    throw new YoutubeDirectApiError("integrity_failed", response.status);
  const size = Number(raw);
  if (size > AUDIO_MAX_BYTES)
    throw new YoutubeDirectApiError("oversize", response.status);
  return size;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function discardBody(response: Response): void {
  // A source's cancellation promise can itself stall. Initiate cleanup without
  // allowing it to hold the request/error past the total deadline.
  void response.body?.cancel().catch(() => {});
}

async function readBoundedBody(
  response: Response,
  signal: AbortSignal,
  onStage: AcquireYoutubeAudioOptions["onStage"],
  attempt: number,
  onProgress: () => void,
): Promise<ArrayBuffer> {
  if (!response.body)
    throw new YoutubeDirectApiError("unavailable", response.status);
  let declared: number | undefined;
  try {
    declared = declaredLength(response);
    if (declared !== undefined && declared < 44)
      throw new YoutubeDirectApiError("integrity_failed", response.status);
  } catch (error) {
    discardBody(response);
    throw error;
  }
  const reader = response.body.getReader();
  // Stage just the RIFF prefix before allocating, rejecting invalid signatures
  // and inconsistent lengths first. Known lengths and unknown RIFF lengths both
  // write directly into the returned owned buffer once its size is validated.
  // No retained chunk list, growth copies, or final output copy. Live adapter
  // storage is output + 12 bytes + the current transport chunk; fetch buffering
  // and WebCrypto's internal digest copy are additional, implementation-owned.
  const prefix = new Uint8Array(12);
  let buffer: ArrayBuffer | undefined;
  let bytes: Uint8Array | undefined;
  let total = 0;
  let complete = false;
  try {
    for (;;) {
      signal.throwIfAborted();
      const { done, value } = await interruptible(reader.read(), signal);
      if (done) {
        complete = true;
        break;
      }
      if (!value || value.byteLength === 0) continue;
      onProgress();
      const nextTotal = total + value.byteLength;
      if (nextTotal > AUDIO_MAX_BYTES)
        throw new YoutubeDirectApiError("oversize", response.status);
      if (!bytes) {
        const copied = Math.min(value.byteLength, prefix.length - total);
        prefix.set(value.subarray(0, copied), total);
        if (nextTotal >= prefix.length) {
          const header = new DataView(prefix.buffer);
          if (
            header.getUint32(0) !== 0x52494646 ||
            header.getUint32(8) !== 0x57415645
          )
            throw new YoutubeDirectApiError(
              "integrity_failed",
              response.status,
            );
          const size = header.getUint32(4, true) + 8;
          if (size > AUDIO_MAX_BYTES)
            throw new YoutubeDirectApiError("oversize", response.status);
          if (
            size < 44 ||
            nextTotal > size ||
            (declared !== undefined && size !== declared)
          )
            throw new YoutubeDirectApiError(
              "integrity_failed",
              response.status,
            );
          buffer = new ArrayBuffer(size);
          bytes = new Uint8Array(buffer);
          bytes.set(prefix.subarray(0, total));
        }
      }
      if (bytes) {
        if (nextTotal > bytes.byteLength)
          throw new YoutubeDirectApiError("integrity_failed", response.status);
        bytes.set(value, total);
      }
      total = nextTotal;
      onStage?.({
        stage: "downloading",
        attempt,
        status: response.status,
        bytes: total,
      });
    }
    if (!buffer || total !== buffer.byteLength || total < 44)
      throw new YoutubeDirectApiError("integrity_failed", response.status);
    return buffer;
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (error instanceof YoutubeDirectApiError) throw error;
    throw new YoutubeDirectApiError("network_error", response.status);
  } finally {
    if (!complete) void reader.cancel(signal.reason).catch(() => {});
    reader.releaseLock();
  }
}

export async function acquireYoutubeAudio(
  videoId: string,
  options: AcquireYoutubeAudioOptions,
): Promise<AcquiredYoutubeAudio> {
  if (!VIDEO_ID.test(videoId))
    throw new YoutubeDirectApiError("invalid_video_id");
  if (!options || typeof options.publicKey !== "string" || !options.publicKey)
    throw new YoutubeDirectApiError("auth");

  configuredYoutubeOrigin();
  const { publicKey, signal: callerSignal, onStage } = options;
  const fetchImpl: YoutubeDirectFetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  callerSignal?.throwIfAborted();

  const url =
    `${configuredYoutubeOrigin()}/v1/videos/${videoId}` +
    "/audio?format=bestaudio%2Fbest&audio-format=wav";
  const deadline = Date.now() + YOUTUBE_DIRECT_ABSOLUTE_DEADLINE_MS;
  const lifetime = new AbortController();
  const { signal } = lifetime;
  const timeout = () =>
    lifetime.abort(new YoutubeDirectApiError("request_timeout"));
  let timer!: ReturnType<typeof setTimeout>; const armStall = () => { clearTimeout(timer); timer = setTimeout(timeout, YOUTUBE_DIRECT_TOTAL_DEADLINE_MS) }; const absoluteTimer = setTimeout(timeout, YOUTUBE_DIRECT_ABSOLUTE_DEADLINE_MS); armStall();
  const abort = () => lifetime.abort(callerSignal?.reason);
  callerSignal?.addEventListener("abort", abort, { once: true });
  const check = () => {
    if (Date.now() >= deadline && !signal.aborted) timeout();
    signal.throwIfAborted();
  };
  let attempt = 0;

  try {
    for (;;) {
      check();
      attempt++;
      onStage?.({ stage: "request", attempt });
      check();

      let response: Response | undefined;
      try {
        const pending = fetchImpl(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${publicKey}`,
            Prefer: "wait=15",
          },
          credentials: "omit",
          redirect: "error",
          signal,
        }).then((result) => {
          if (signal.aborted) {
            discardBody(result);
            throw signal.reason;
          }
          response = result;
          return result;
        });
        response = await interruptible(pending, signal);
      } catch (error) {
        if (signal.aborted) {
          if (response) discardBody(response);
          throw signal.reason;
        }
        throw new YoutubeDirectApiError("network_error");
      }

      if (Date.now() >= deadline || signal.aborted) {
        discardBody(response);
        check();
      }
      if (response.status === 202) {
        discardBody(response);
        const retryAfterSec = retryAfterSeconds(
          response.headers.get("Retry-After"),
        );
        const waitMs =
          retryAfterSec === undefined
            ? DEFAULT_RETRY_AFTER_MS
            : retryAfterSec * 1000;
        if (Date.now() + waitMs >= deadline)
          throw new YoutubeDirectApiError(
            "request_timeout",
            202,
            retryAfterSec,
          );
        onStage?.({
          stage: "waiting",
          attempt,
          status: 202,
          retryAfterSec,
        });
        clearTimeout(timer);
        await wait(waitMs, signal);
        armStall();
        continue;
      }

      if (response.status === 401) {
        discardBody(response);
        throw new YoutubeDirectApiError("auth", 401);
      }

      if (response.status === 429) {
        discardBody(response);
        throw new YoutubeDirectApiError(
          "rate_limited",
          429,
          retryAfterSeconds(response.headers.get("Retry-After")),
        );
      }

      if (response.status !== 200) {
        discardBody(response);
        throw new YoutubeDirectApiError("unavailable", response.status);
      }

      armStall();
      const bytes = await readBoundedBody(response, signal, onStage, attempt, armStall);
      check();
      onStage?.({
        stage: "verifying",
        attempt,
        status: 200,
        bytes: bytes.byteLength,
      });
      check();

      let wav;
      try {
        wav = inspectWav(bytes);
        // The shared inspector validates PCM format/data. Also reject trailing
        // partial chunks and inconsistent PCM byte-rate/block-alignment fields.
        const view = new DataView(bytes);
        let offset = 12;
        while (offset + 8 <= bytes.byteLength) {
          const size = view.getUint32(offset + 4, true);
          if (
            view.getUint32(offset) === 0x666d7420 &&
            (view.getUint32(offset + 16, true) !== wav.sampleRate * 4 ||
              view.getUint16(offset + 20, true) !== 4)
          )
            throw new Error("Invalid PCM alignment");
          offset += 8 + size + (size & 1);
        }
        if (offset !== bytes.byteLength)
          throw new Error("Trailing partial WAV chunk");
      } catch {
        throw new YoutubeDirectApiError("integrity_failed", 200);
      }
      const durationSeconds = wav.frames / wav.sampleRate;
      if (
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0 ||
        durationSeconds > AUDIO_MAX_SECONDS
      )
        throw new YoutubeDirectApiError("integrity_failed", 200);

      check();
      const audioSha256 = await interruptible(sha256Hex(bytes), signal);
      check();

      return {
        bytes,
        audioSha256,
        sampleRate: wav.sampleRate,
        frames: wav.frames,
        durationSeconds,
      };
    }
  } finally {
    clearTimeout(timer);
    clearTimeout(absoluteTimer);
    callerSignal?.removeEventListener("abort", abort);
  }
}
