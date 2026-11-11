import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { describe, expect, it } from "vitest";

function loadCodec() {
  let phase1Calls = 0;
  const forbidden = () => {
    phase1Calls += 1;
    throw new Error("phase1 fixture must not be called");
  };
  const source = readFileSync(
    new URL("../src/local-allkeys-share.ts", import.meta.url),
    "utf8",
  );
  const fixtureSource = source
    .replace(
      /import\s*\{\s*validateLocalAllKeysRecord,\s*type LocalAllKeysEnvelope,?\s*\}\s*from "\.\/local-allkeys-record";/,
      "const validateLocalAllKeysRecord = __phase1;",
    )
    .replace(
      /import\s*\{ verifyLocalAllKeysReplay \}\s*from "\.\/local-allkeys-replay";/,
      "const verifyLocalAllKeysReplay = __phase1;",
    );
  const code = stripTypeScriptTypes(fixtureSource, {
    mode: "strip",
  }).replace(/^export\s+/gm, "");
  const codec = new Function(
    "__phase1",
    `"use strict";
${code}
return {
  LOCAL_ALLKEYS_SHARE_PREFIX,
  LOCAL_ALLKEYS_MAX_COMPRESSED_BYTES,
  LOCAL_ALLKEYS_MAX_INFLATED_BYTES,
  LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS,
  encodeLocalAllKeysShare,
  decodeLocalAllKeysShare,
};`,
  )(forbidden);
  return { codec, calls: () => phase1Calls };
}

// These tests exercise codec-owned guards only; the unavailable phase1 modules
// deliberately throw rather than supplying validation or replay behavior.
describe("CODEC UNIT FIXTURE", () => {
  it("rejects pre-aborted encode and decode before phase1", async () => {
    const { codec, calls } = loadCodec();
    const controller = new AbortController();
    controller.abort();
    const options = { signal: controller.signal };
    await expect(
      Promise.resolve().then(() => codec.encodeLocalAllKeysShare({}, options)),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      Promise.resolve().then(() =>
        codec.decodeLocalAllKeysShare(
          `${codec.LOCAL_ALLKEYS_SHARE_PREFIX}AA`,
          options,
        ),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(calls()).toBe(0);
  });

  it("rejects an invalid prefix and noncanonical base64 before phase1", async () => {
    const { codec, calls } = loadCodec();
    for (const fragment of [
      "v=other&d=AA",
      `${codec.LOCAL_ALLKEYS_SHARE_PREFIX}A`,
      `${codec.LOCAL_ALLKEYS_SHARE_PREFIX}AB`,
      `${codec.LOCAL_ALLKEYS_SHARE_PREFIX}AA=`,
      `${codec.LOCAL_ALLKEYS_SHARE_PREFIX}AA!`,
    ]) {
      await expect(
        Promise.resolve().then(() => codec.decodeLocalAllKeysShare(fragment)),
      ).rejects.toThrow();
    }
    expect(calls()).toBe(0);
  });

  it("exports literal byte bounds and includes prefix overhead in the fragment bound", () => {
    const { codec, calls } = loadCodec();
    expect(codec.LOCAL_ALLKEYS_SHARE_PREFIX).toBe("v=local-allkeys-v1&d=");
    expect(codec.LOCAL_ALLKEYS_MAX_COMPRESSED_BYTES).toBe(512 * 1024);
    expect(codec.LOCAL_ALLKEYS_MAX_INFLATED_BYTES).toBe(4 * 1024 * 1024);
    expect(codec.LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS).toBe(
      "v=local-allkeys-v1&d=".length + Math.ceil((4 * 512 * 1024) / 3),
    );
    expect(calls()).toBe(0);
  });

  it("rejects an accessor-bearing non-JSON input without invoking its getter or phase1", async () => {
    const { codec, calls } = loadCodec();
    let getterCalls = 0;
    const input = Object.defineProperty({}, "record", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("input accessor must not be called");
      },
    });
    await expect(
      Promise.resolve().then(() => codec.encodeLocalAllKeysShare(input)),
    ).rejects.toThrow();
    expect(getterCalls).toBe(0);
    expect(calls()).toBe(0);
  });
});

import { test } from "vitest";
import type { RuntimeReplay } from "../src/replay";
test("REAL phase1 all-keys share roundtrip", async () => {
  const { generateLocalAllKeysRecord, localAllKeysIdentity } =
    await import("../src/local-allkeys-record");
  const {
    encodeLocalAllKeysShare,
    decodeLocalAllKeysShare,
    LOCAL_ALLKEYS_SHARE_PREFIX,
  } = await import("../src/local-allkeys-share");
  const { makePcm16StereoWav } = await import("./youtube-direct-fixture");
  const pcm = new Int16Array(12 * 48000 * 2);
  for (let frame = 0; frame < pcm.length / 2; frame++) {
    const sample = Math.round(
      16000 *
        Math.exp(-((frame % 19200) / 48000) * 40) *
        Math.sin(2 * Math.PI * 220 * ((frame % 19200) / 48000)),
    );
    pcm[frame * 2] = pcm[frame * 2 + 1] = sample;
  }
  const { bytes } = makePcm16StereoWav({
    sampleRate: 48000,
    frames: 12 * 48000,
    samples: pcm,
  });
  const env = await generateLocalAllKeysRecord({
    bytes: bytes.buffer as ArrayBuffer,
    videoId: "AAAAAAAAAAA",
  });
  const song = localAllKeysIdentity(env);
  const securityReplay: RuntimeReplay = {
    version: 1,
    song,
    lanes: 4,
    difficulty: "low",
    options: { speed: 3, fader: "off", shuffle: "off", seed: 0 },
    ops: [[1, 100, 9999]],
    end: 100,
  };
  const badHash = structuredClone(env);
  badHash.record.charts["4:low"].sha256 = "0".repeat(64);
  await expect(
    encodeLocalAllKeysShare({ record: badHash, replay: securityReplay }),
  ).rejects.toThrow();
  const badProvenance = Object.assign(structuredClone(env), {
    sourceProvenance: "opus-v7",
  });
  await expect(
    encodeLocalAllKeysShare({ record: badProvenance, replay: securityReplay }),
  ).rejects.toThrow();
  await expect(
    encodeLocalAllKeysShare({
      record: env,
      replay: { ...securityReplay, song: `${song}-wrong` },
    }),
  ).rejects.toThrow();
  await expect(
    encodeLocalAllKeysShare({
      record: env,
      replay: { ...securityReplay, ops: [[0, 0, 0, 4, 1]] },
    }),
  ).rejects.toThrow();
  expect(Object.keys(env.record.charts)).toHaveLength(20);
  let previous: typeof env | undefined;
  for (const lanes of [4, 5, 6, 7, 8] as const)
    for (const difficulty of ["low", "mid", "high", "sc"] as const) {
      const replay: RuntimeReplay = {
        version: 1,
        song,
        lanes,
        difficulty,
        options: { speed: 3, fader: "off", shuffle: "off", seed: 0 },
        ops: [
          [3, 0, 0, 4, "off"],
          [1, 100, 9999],
        ],
        end: 100,
      };
      const fragment = await encodeLocalAllKeysShare({ record: env, replay });
      const decoded = await decodeLocalAllKeysShare(fragment);
      if (!previous) {
        const measurement = JSON.stringify({
          fragmentChars: fragment.length,
          recordBytes: new TextEncoder().encode(JSON.stringify(env)).length,
          compressedBytes: atob(
            fragment
              .slice(LOCAL_ALLKEYS_SHARE_PREFIX.length)
              .replace(/-/g, "+")
              .replace(/_/g, "/"),
          ).length,
          allChartCount: Object.keys(env.record.charts).length,
        });
        console.log(measurement);
        writeFileSync(
          join(
            mkdtempSync(join(tmpdir(), "local-allkeys-share-")),
            "size-results.json",
          ),
          measurement,
        );
      }
      expect(localAllKeysIdentity(decoded.record)).toEqual(song);
      expect(decoded.replay).toEqual(replay);
      expect(decoded.result.options.speed).toBe(4);
      const notes = env.record.charts[`${lanes}:${difficulty}`].notes;
      expect(decoded.frozenNotes).toEqual(notes);
      expect(decoded.frozenNotes).not.toBe(notes);
      expect(decoded.record).toEqual(env);
      expect(decoded.record).not.toBe(env);
      expect(decoded.record).not.toBe(previous);
      previous = decoded.record;
    }
}, 30000);
