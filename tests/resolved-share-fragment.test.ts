import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  classifyResolvedShareFragment,
  prepareResolvedShareRoute,
  decodeResolvedShareRoute,
  type ResolvedShareDecoders,
} from "../src/resolved-share-fragment";
import {
  LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS,
  decodeLocalAllKeysShare,
} from "../src/local-allkeys-share";
import {
  PROGRESSIVE_SHARE_PREFIX,
  PROGRESSIVE_MAX_FRAGMENT_CHARS,
  encodeProgressiveShare,
  decodeProgressiveShare,
} from "../src/progressive/share-proof";

const href = "https://example.test/result/?s=abcdefghijklmnopqrst";
const now = Date.parse("2026-11-11T00:00:00Z");
const expiresAt = "2027-11-11T00:00:00Z";
it("settles when a decoder ignores cancellation", async () => {
  const controller = new AbortController();
  const decoder = vi.fn(() => new Promise<string>(() => {}));
  const decoders: ResolvedShareDecoders<string> = {
    "local-allkeys": decoder,
    "local-allkeys-progressive": decoder,
    v5: decoder,
    v6: decoder,
    v7: decoder,
    builtin: decoder,
  };
  const pending = decodeResolvedShareRoute(
    href,
    { fragment: "v=4", expiresAt },
    now,
    decoders,
    controller.signal,
  );
  await Promise.resolve();
  controller.abort(Error("test deadline"));
  await expect(pending).rejects.toThrow("test deadline");
});
it.each(["local-allkeys-v1", "local-allkeys-progressive-v1", "5", "6", "7", "4"])(
  "selects only version %s decoder",
  async (version) => {
    const decoders = {
      "local-allkeys": vi.fn(async () => "local-allkeys"),
      "local-allkeys-progressive": vi.fn(async () => "local-allkeys-progressive"),
      v5: vi.fn(async () => "v5"),
      v6: vi.fn(async () => "v6"),
      v7: vi.fn(async () => "v7"),
      builtin: vi.fn(async () => "builtin"),
    };
    const fragment =
      version === "4"
        ? "v=4"
        : version === "local-allkeys-progressive-v1"
          ? "v=local-allkeys-progressive-v1&d=AA&pm=BB&mh=CC"
          : `v=${version}&d=AA`;
    const expected =
      version === "4"
        ? "builtin"
        : version === "local-allkeys-v1"
          ? "local-allkeys"
          : version === "local-allkeys-progressive-v1"
            ? "local-allkeys-progressive"
            : `v${version}`;
    const output = await decodeResolvedShareRoute(
      href,
      { fragment, expiresAt },
      now,
      decoders as ResolvedShareDecoders<string>,
      new AbortController().signal,
    );
    expect(output.value).toBe(expected);
    for (const [kind, decoder] of Object.entries(decoders))
      expect(decoder).toHaveBeenCalledTimes(kind === expected ? 1 : 0);
  },
);
// Minimal routing strings only: these are deliberately NOT valid replay payloads.
it.each([
  ["v=local-allkeys-v1&d=AA", "local-allkeys"],
  ["v=local-allkeys-progressive-v1&d=AA&pm=BB&mh=CC", "local-allkeys-progressive"],
  ["v=5&d=AA", "v5"],
  ["v=6&d=AA", "v6"],
  ["v=7&d=AA", "v7"],
  ...["1", "2", "3", "4"].map((v) => [`v=${v}&song=first-light`, "builtin"]),
])("classifies %s without claiming payload validity", (fragment, kind) => {
  expect(classifyResolvedShareFragment(fragment)).toBe(kind);
  const route = prepareResolvedShareRoute(href, { fragment, expiresAt }, now);
  expect(route).toMatchObject({ kind, fragment, arrivalHref: href });
  expect(Object.isFrozen(route)).toBe(true);
});

it("uses the existing local bound rather than the historical 160000-byte API branch", () => {
  const prefix = "v=local-allkeys-v1&d=";
  const fragment =
    prefix + "A".repeat(LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS - prefix.length);
  expect(classifyResolvedShareFragment(fragment)).toBe("local-allkeys");
  expect(() => classifyResolvedShareFragment(fragment + "A")).toThrow(
    "too-large",
  );
  expect(() =>
    classifyResolvedShareFragment("v=4&x=" + "A".repeat(160000)),
  ).toThrow("too-large");
});

it.each([
  "",
  "#v=5&d=AA",
  "v=5&d=",
  "v=5&v=6&d=AA",
  "v=5&d=AA&d=BB",
  "v=8&d=AA",
  "d=AA&v=5",
])("rejects ambiguous or unsupported routing %s", (fragment) => {
  expect(() => classifyResolvedShareFragment(fragment)).toThrow();
});

it.each([
  href.replace("abcdefghijklmnopqrst", "short"),
  href + "&s=abcdefghijklmnopqrst",
  href + "#v=4",
  href.replace("/result/", "/select/"),
  "not a URL",
  href.replace("https:", "ftp:"),
  href.replace("example.test", "user@example.test"),
])("rejects malformed short arrival %s", (arrival) => {
  expect(() =>
    prepareResolvedShareRoute(arrival, { fragment: "v=4", expiresAt }, now),
  ).toThrow("invalid-route");
});

it("rejects malformed and expired records, including exact expiry", () => {
  for (const record of [
    null,
    [],
    {},
    { fragment: 1, expiresAt },
    { fragment: "v=4", expiresAt: "bad" },
  ])
    expect(() => prepareResolvedShareRoute(href, record, now)).toThrow(
      "invalid-record",
    );
  expect(() =>
    prepareResolvedShareRoute(
      href,
      { fragment: "v=4", expiresAt: new Date(now).toISOString() },
      now,
    ),
  ).toThrow("expired");
});

it("dispatches the opaque full fragment once and preserves decoder refusal", async () => {
  const decoder = vi.fn(async () => {
    throw Error("existing decoder rejected payload");
  });
  const decoders: ResolvedShareDecoders<never> = {
    "local-allkeys": decoder,
    "local-allkeys-progressive": decoder,
    v5: decoder,
    v6: decoder,
    v7: decoder,
    builtin: decoder,
  };
  const fragment = "v=local-allkeys-v1&d=AA";
  const signal = new AbortController().signal;
  await expect(
    decodeResolvedShareRoute(
      href,
      { fragment, expiresAt },
      now,
      decoders,
      signal,
    ),
  ).rejects.toThrow("existing decoder rejected payload");
  expect(decoder).toHaveBeenCalledExactlyOnceWith(fragment, { signal });
});

it("returns the original short identity and refuses results after cancellation", async () => {
  const controller = new AbortController();
  const decoder = vi.fn(async () => "decoded-fixture");
  const decoders: ResolvedShareDecoders<string> = {
    "local-allkeys": decoder,
    "local-allkeys-progressive": decoder,
    v5: decoder,
    v6: decoder,
    v7: decoder,
    builtin: decoder,
  };
  const record = { fragment: "v=4", expiresAt };
  expect(
    (
      await decodeResolvedShareRoute(
        href,
        record,
        now,
        decoders,
        controller.signal,
      )
    ).route.arrivalHref,
  ).toBe(href);
  decoder.mockImplementation(async () => {
    controller.abort();
    return "late";
  });
  await expect(
    decodeResolvedShareRoute(href, record, now, decoders, controller.signal),
  ).rejects.toThrow();
  decoder.mockClear();
  await expect(
    decodeResolvedShareRoute(href, record, now, decoders, controller.signal),
  ).rejects.toThrow();
  expect(decoder).not.toHaveBeenCalled();
});

it.each([
  "v=local-allkeys-progressive-v1&d=AA",
  "v=local-allkeys-progressive-v1&d=AA&pm=BB",
  "v=local-allkeys-progressive-v1&d=AA&mh=CC&pm=BB",
  "v=local-allkeys-progressive-v1&d=AA&pm=BB&pm=CC&mh=DD",
  "v=local-allkeys-progressive-v1&d=AA&pm=BB&mh=CC&mh=DD",
  "v=local-allkeys-progressive-v1&d=AA&pm=&mh=CC",
  "v=local-allkeys-progressive-v1&d=AA&pm=BB&mh=",
  "v=local-allkeys-progressive-v1&d=&pm=BB&mh=CC",
  "v=local-allkeys-progressive-v1&d=AA&pm=BB&mh=CC&x=1",
])("rejects ambiguous or unsupported progressive routing %s", (fragment) => {
  expect(() => classifyResolvedShareFragment(fragment)).toThrow();
});

it("enforces progressive size boundary at exact limit", () => {
  const suffix = "&pm=BB&mh=CC";
  const fragment =
    PROGRESSIVE_SHARE_PREFIX +
    "A".repeat(PROGRESSIVE_MAX_FRAGMENT_CHARS - PROGRESSIVE_SHARE_PREFIX.length - suffix.length) +
    suffix;
  expect(fragment).toHaveLength(PROGRESSIVE_MAX_FRAGMENT_CHARS);
  expect(classifyResolvedShareFragment(fragment)).toBe(
    "local-allkeys-progressive",
  );
  const over = fragment.slice(0, -1) + "C" + fragment.slice(-1);
  expect(() => classifyResolvedShareFragment(over)).toThrow("too-large");
});

it("routes a real progressive share through the full validating decoder", async () => {
  const fixture = JSON.parse(
    readFileSync("tests/fixtures/local-allkeys-public.json", "utf8"),
  );
  const before = await decodeLocalAllKeysShare(fixture.shareFragment);
  const b = Buffer.from(fixture.row.bytesBase64, "base64");
  const bytes = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  const share = await encodeProgressiveShare(
    { record: before.record, replay: before.replay },
    bytes,
  );
  expect(classifyResolvedShareFragment(share)).toBe(
    "local-allkeys-progressive",
  );
  const progressiveDecoder = vi.fn((fragment: string, options: { signal: AbortSignal }) =>
    decodeProgressiveShare(fragment, options.signal),
  );
  const other = vi.fn(async () => "other");
  const decoders: ResolvedShareDecoders<unknown> = {
    "local-allkeys": other,
    "local-allkeys-progressive": progressiveDecoder,
    v5: other,
    v6: other,
    v7: other,
    builtin: other,
  };
  const output = await decodeResolvedShareRoute(
    href,
    { fragment: share, expiresAt },
    now,
    decoders,
    new AbortController().signal,
  );
  expect(output.value).toEqual(await decodeProgressiveShare(share));
  expect(progressiveDecoder).toHaveBeenCalledTimes(1);
  for (const [kind, decoder] of Object.entries(decoders))
    if (kind !== "local-allkeys-progressive")
      expect(decoder).not.toHaveBeenCalled();
});
