import {
  validateLocalAllKeysRecord,
  type LocalAllKeysEnvelope,
} from "./local-allkeys-record";
import { verifyLocalAllKeysReplay } from "./local-allkeys-replay";
import type { RuntimeReplay } from "./replay";

export type { LocalAllKeysEnvelope, RuntimeReplay };
export type LocalAllKeysShareResult = Awaited<
  ReturnType<typeof verifyLocalAllKeysReplay>
>;
export interface LocalAllKeysShareInput {
  record: LocalAllKeysEnvelope;
  replay: RuntimeReplay;
}
export interface LocalAllKeysShareOptions {
  signal?: AbortSignal;
}

export const LOCAL_ALLKEYS_SHARE_PREFIX = "v=local-allkeys-v1&d=";
export const LOCAL_ALLKEYS_MAX_COMPRESSED_BYTES = 512 * 1024;
export const LOCAL_ALLKEYS_MAX_INFLATED_BYTES = 4 * 1024 * 1024;
export const LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS =
  LOCAL_ALLKEYS_SHARE_PREFIX.length +
  Math.ceil((LOCAL_ALLKEYS_MAX_COMPRESSED_BYTES * 4) / 3);

const utf8 = new TextEncoder();
const forbiddenKeys = new Set(["__proto__", "prototype", "constructor"]);
const chartKeys = [4, 5, 6, 7, 8].flatMap((lanes) =>
  ["low", "mid", "high", "sc"].map((difficulty) => `${lanes}:${difficulty}`),
);
const maxDepth = 64;
const invalid = () => new Error("Invalid local all-keys share");
const tooLarge = () => new Error("Local all-keys share too large");

function exactObject(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw invalid();
  const keys = Reflect.ownKeys(value);
  if (
    keys.some(
      (key) =>
        typeof key !== "string" ||
        forbiddenKeys.has(key) ||
        (!required.includes(key) && !optional.includes(key)),
    ) ||
    required.some((key) => !Object.hasOwn(value, key))
  )
    throw invalid();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      throw invalid();
  }
}

/** Snapshot only bounded JSON data, without invoking accessors or toJSON. */
function jsonBytes(value: unknown): Uint8Array {
  let size = 0;
  const ancestors = new Set<object>();
  function token(text: string) {
    size += utf8.encode(text).length;
    if (size > LOCAL_ALLKEYS_MAX_INFLATED_BYTES) throw tooLarge();
    return text;
  }
  function string(value: string) {
    if (value.length > LOCAL_ALLKEYS_MAX_INFLATED_BYTES) throw tooLarge();
    return token(JSON.stringify(value));
  }
  function visit(value: unknown, depth: number): string {
    if (depth > maxDepth) throw invalid();
    if (value === null) return token("null");
    if (typeof value === "string") return string(value);
    if (typeof value === "boolean") return token(String(value));
    if (typeof value === "number" && Number.isFinite(value))
      return token(JSON.stringify(value));
    if (!value || typeof value !== "object" || ancestors.has(value))
      throw invalid();
    ancestors.add(value);
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      array
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    )
      throw invalid();
    const keys = Reflect.ownKeys(value);
    const parts: string[] = [];
    token(array ? "[" : "{");
    if (array) {
      if (value.length > LOCAL_ALLKEYS_MAX_INFLATED_BYTES / 2) throw tooLarge();
      if (keys.length !== value.length + 1) throw invalid();
      for (let i = 0; i < value.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (
          !descriptor ||
          !descriptor.enumerable ||
          !Object.hasOwn(descriptor, "value")
        )
          throw invalid();
        if (i) token(",");
        parts.push(visit(descriptor.value, depth + 1));
      }
    } else {
      for (const key of keys) {
        if (typeof key !== "string" || forbiddenKeys.has(key)) throw invalid();
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
          throw invalid();
        if (parts.length) token(",");
        const name = string(key);
        token(":");
        parts.push(`${name}:${visit(descriptor.value, depth + 1)}`);
      }
    }
    token(array ? "]" : "}");
    ancestors.delete(value);
    return array ? `[${parts.join(",")}]` : `{${parts.join(",")}}`;
  }
  return utf8.encode(visit(value, 0));
}

/** JSON.parse alone loses duplicate keys, including escaped duplicates. */
function parseJson(bytes: Uint8Array): unknown {
  if (bytes.length > LOCAL_ALLKEYS_MAX_INFLATED_BYTES) throw tooLarge();
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  let at = 0;
  const primitive =
    /(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/y;
  function whitespace() {
    while (at < text.length && /[\x20\t\r\n]/.test(text[at])) at++;
  }
  function string(): string {
    if (text[at] !== '"') throw invalid();
    const start = at++;
    while (at < text.length) {
      const character = text[at++];
      if (character === '"') return JSON.parse(text.slice(start, at));
      if (character === "\\") at++;
    }
    throw invalid();
  }
  function value(depth: number): unknown {
    if (depth > maxDepth) throw invalid();
    whitespace();
    if (text[at] === '"') return string();
    if (text[at] === "{") {
      at++;
      whitespace();
      const result: Record<string, unknown> = {};
      if (text[at] !== "}") {
        for (;;) {
          whitespace();
          const key = string();
          if (forbiddenKeys.has(key) || Object.hasOwn(result, key))
            throw invalid();
          whitespace();
          if (text[at++] !== ":") throw invalid();
          result[key] = value(depth + 1);
          whitespace();
          if (text[at] !== ",") break;
          at++;
        }
      }
      if (text[at++] !== "}") throw invalid();
      return result;
    }
    if (text[at] === "[") {
      at++;
      whitespace();
      const result: unknown[] = [];
      if (text[at] !== "]") {
        for (;;) {
          result.push(value(depth + 1));
          whitespace();
          if (text[at] !== ",") break;
          at++;
        }
      }
      if (text[at++] !== "]") throw invalid();
      return result;
    }
    primitive.lastIndex = at;
    const match = primitive.exec(text);
    if (!match) throw invalid();
    at = primitive.lastIndex;
    const result: unknown = JSON.parse(match[0]);
    if (typeof result === "number" && !Number.isFinite(result)) throw invalid();
    return result;
  }
  const result = value(0);
  whitespace();
  if (at !== text.length) throw invalid();
  return result;
}

/** Field shape is codec-owned; hashes, identity and replay semantics are phase1-owned. */
function checkPayload(record: unknown, replay: unknown) {
  exactObject(record, ["version", "kind", "sourceProvenance", "record"]);
  if (
    record.version !== 1 ||
    record.kind !== "orvio-local-allkeys" ||
    record.sourceProvenance !== "local-allkeys-v1"
  )
    throw invalid();
  const source = record.record;
  exactObject(source, [
    "version",
    "videoId",
    "audioSha256",
    "sampleRate",
    "frames",
    "estimatedBpm",
    "pipelineVersion",
    "analyzerVersion",
    "config",
    "lanes",
    "charts",
    "chartMetadata",
    "chartSetSha256",
  ]);
  if (
    source.version !== 3 ||
    !Array.isArray(source.lanes) ||
    source.lanes.length !== 5 ||
    source.lanes.some((lane, index) => lane !== index + 4)
  )
    throw invalid();
  exactObject(source.charts, chartKeys);
  exactObject(source.chartMetadata, chartKeys);
  for (const key of chartKeys) {
    const chart = source.charts[key];
    exactObject(chart, ["notes", "sha256"]);
    if (!Array.isArray(chart.notes)) throw invalid();
    for (const note of chart.notes)
      exactObject(note, ["id", "time", "lane"], ["end"]);
    const metadata = source.chartMetadata[key];
    exactObject(metadata, ["version", "family", "rating", "status"]);
    if (metadata.rating !== null)
      exactObject(metadata.rating, ["scale", "level"]);
  }
  exactObject(
    replay,
    ["version", "song", "lanes", "difficulty", "options", "ops", "end"],
    ["audioLeadIn", "fever"],
  );
  exactObject(replay.options, ["speed", "fader", "shuffle", "seed"]);
  if (Object.hasOwn(replay, "fever"))
    exactObject(replay.fever, ["version", "rulesId", "auto"]);
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unbase64url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) throw invalid();
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  if (binary.length > LOCAL_ALLKEYS_MAX_COMPRESSED_BYTES) throw tooLarge();
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (base64url(bytes) !== text) throw invalid();
  return bytes;
}

async function transform(
  bytes: Uint8Array,
  compress: boolean,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  signal?.throwIfAborted();
  const reader = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(
      compress
        ? new CompressionStream("deflate")
        : new DecompressionStream("deflate"),
    )
    .getReader();
  let cancellation: Promise<void> | undefined;
  const cancel = () => {
    cancellation ??= reader.cancel().catch(() => {});
    return cancellation;
  };
  const onAbort = () => {
    void cancel();
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const chunks: Uint8Array[] = [];
    const limit = compress
      ? LOCAL_ALLKEYS_MAX_COMPRESSED_BYTES
      : LOCAL_ALLKEYS_MAX_INFLATED_BYTES;
    let size = 0;
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw tooLarge();
      chunks.push(value);
    }
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  } catch (error) {
    await cancel();
    signal?.throwIfAborted();
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

async function verify(
  record: unknown,
  replay: unknown,
  signal?: AbortSignal,
): Promise<LocalAllKeysShareResult> {
  signal?.throwIfAborted();
  checkPayload(record, replay);
  const validated = await validateLocalAllKeysRecord(record, { signal });
  signal?.throwIfAborted();
  const verified = await verifyLocalAllKeysReplay(validated, replay, {
    signal,
  });
  signal?.throwIfAborted();
  return verified;
}

/** Local-only wire adapter. The actual phase1 modules are required at runtime. */
export async function encodeLocalAllKeysShare(
  input: LocalAllKeysShareInput,
  options?: LocalAllKeysShareOptions,
): Promise<string> {
  const signal = options?.signal;
  signal?.throwIfAborted();
  try {
    // Capture both inputs before the first await; caller edits cannot race validation.
    const snapshot = parseJson(jsonBytes(input));
    exactObject(snapshot, ["record", "replay"]);
    const safe = await verify(snapshot.record, snapshot.replay, signal);
    signal?.throwIfAborted();
    const wrapper = {
      version: 1,
      kind: "orvio-local-allkeys-share",
      sourceProvenance: "local-allkeys-v1",
      record: safe.record,
      replay: safe.replay,
    };
    checkPayload(wrapper.record, wrapper.replay);
    const bytes = jsonBytes(wrapper);
    const compressed = await transform(bytes, true, signal);
    signal?.throwIfAborted();
    const fragment = LOCAL_ALLKEYS_SHARE_PREFIX + base64url(compressed);
    if (fragment.length > LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS) throw tooLarge();
    return fragment;
  } catch (error) {
    signal?.throwIfAborted();
    throw error;
  }
}

/** Returns phase1's independently verified copies and recomputed result. */
export async function decodeLocalAllKeysShare(
  fragment: string,
  options?: LocalAllKeysShareOptions,
): Promise<LocalAllKeysShareResult> {
  const signal = options?.signal;
  signal?.throwIfAborted();
  try {
    if (
      typeof fragment !== "string" ||
      fragment.length > LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS ||
      !fragment.startsWith(LOCAL_ALLKEYS_SHARE_PREFIX)
    )
      throw invalid();
    const compressed = unbase64url(
      fragment.slice(LOCAL_ALLKEYS_SHARE_PREFIX.length),
    );
    const bytes = await transform(compressed, false, signal);
    signal?.throwIfAborted();
    const wrapper = parseJson(bytes);
    exactObject(wrapper, [
      "version",
      "kind",
      "sourceProvenance",
      "record",
      "replay",
    ]);
    if (
      wrapper.version !== 1 ||
      wrapper.kind !== "orvio-local-allkeys-share" ||
      wrapper.sourceProvenance !== "local-allkeys-v1"
    )
      throw invalid();
    return await verify(wrapper.record, wrapper.replay, signal);
  } catch (error) {
    signal?.throwIfAborted();
    throw error;
  }
}
