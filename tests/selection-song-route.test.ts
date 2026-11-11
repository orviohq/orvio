import { describe, expect, it } from "vitest";
import {
  hasSelectionSong,
  resolveSelectionSong,
  selectionRouteOptions,
  selectionSongPath,
} from "../src/selection-song-route";

const video = "dQw4w9WgXcQ";
const full = `yt-opus-${video}-${"a".repeat(64)}-${"b".repeat(64)}`;
function fixture() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  return {
    storage,
    data,
    input: {
      search: `?youtube=${video}`,
      hydrated: true,
      installed: ["first-light", full],
      visible: ["first-light", full],
      videoId: (id: string) => (id === full ? video : undefined),
      preferred: () => full,
      storage,
    },
  };
}
describe("song-only selection routes", () => {
  it("serializes exact builtins and the same short invitation for verified video sources", () => {
    const { storage } = fixture();
    expect(selectionSongPath("first-light", undefined, storage)).toBe(
      "/select/?song=first-light",
    );
    for (const id of [full, "allkeys-identity", "extension-identity"])
      expect(selectionSongPath(id, video, storage)).toBe(
        "/select/?youtube=dQw4w9WgXcQ",
      );
    expect(() => selectionSongPath(full, "bad", storage)).toThrow();
  });
  it("keeps nonbuiltin identities in persistent local aliases, with no hash truncation", () => {
    const { storage, data, input } = fixture();
    const id = "first-light-custom-" + "c".repeat(128);
    const path = selectionSongPath(
      id,
      undefined,
      storage,
      () => "7d8ea421-00c0-4db8-a83e-100000000001",
    );
    expect(path).toBe(
      "/select/?song=local:7d8ea421-00c0-4db8-a83e-100000000001",
    );
    expect(path).not.toContain(id);
    expect([...data.values()][0]).toContain(id);
    expect(
      selectionSongPath(id, undefined, storage, () => {
        throw Error("must reuse");
      }),
    ).toBe(path);
    expect(
      resolveSelectionSong({
        ...input,
        search: path.split("?")[1],
        installed: [id],
      }),
    ).toEqual({ kind: "selected", id });
    expect(
      resolveSelectionSong({ ...input, search: path.split("?")[1] }),
    ).toEqual({ kind: "missing" });
  });
  it("never discloses full identity when local persistence fails", () => {
    expect(() =>
      selectionSongPath("custom-full-identity", undefined, {
        getItem: () => null,
        setItem: () => {
          throw Error("quota");
        },
      }),
    ).toThrow("quota");
  });
  it("waits for full hydration before choosing the current preferred row", () => {
    const { input } = fixture();
    expect(resolveSelectionSong({ ...input, hydrated: false })).toEqual({
      kind: "pending",
    });
    expect(hasSelectionSong(input.search)).toBe(true);
    expect(resolveSelectionSong(input)).toEqual({ kind: "selected", id: full });
    const extension = "verified-current-keymode-extension";
    expect(
      resolveSelectionSong({
        ...input,
        installed: [full, extension],
        visible: [extension],
        videoId: () => video,
        preferred: () => extension,
      }),
    ).toEqual({ kind: "selected", id: extension });
  });
  it("uses only visible installed verified ownership; missing and ambiguous videos invite Add", () => {
    const { input } = fixture();
    for (const change of [
      { visible: [] },
      { installed: [] },
      { videoId: () => undefined },
      {
        installed: ["a", "b"],
        visible: ["a", "b"],
        videoId: () => video,
        preferred: () => undefined,
      },
    ])
      expect(resolveSelectionSong({ ...input, ...change })).toEqual({
        kind: "invitation",
        video,
      });
    expect(
      resolveSelectionSong({ ...input, preferred: () => undefined }),
    ).toEqual({ kind: "selected", id: full });
  });
  it("rejects duplicates, malformed videos and competing song selectors", () => {
    const { input } = fixture();
    for (const search of [
      `?youtube=${video}&youtube=${video}`,
      "?youtube=bad",
      `?youtube=${video}&song=first-light`,
      "?song=first-light&song=first-light",
    ])
      expect(resolveSelectionSong({ ...input, search })).toEqual({
        kind: "missing",
      });
  });
  it("resolves legacy full identities exactly without substituting another same-video row", () => {
    const { input } = fixture();
    expect(
      resolveSelectionSong({
        ...input,
        search: `?song=${full}&lanes=8`,
        preferred: () => "other",
      }),
    ).toEqual({ kind: "selected", id: full });
    for (const id of [full.slice(0, -1), full + "x", "local:unknown"])
      expect(resolveSelectionSong({ ...input, search: `?song=${id}` })).toEqual(
        { kind: "missing" },
      );
  });
  it("ignores all incoming selection settings while retaining play/result parameters", () => {
    const search = `?song=${full}&keys=X&options=remote&lanes=8&difficulty=sc&speed=9&fader=hidden&shuffle=random&seed=99&perf=1`;
    const recipient = {
      keys: ["D", "F"],
      lanes: 4,
      difficulty: "mid",
      speed: 1.5,
      fader: "off",
      shuffle: "off",
      seed: 1,
      perf: false,
    };
    for (const path of ["/select/", "/select"]) {
      const options = selectionRouteOptions(path, search);
      expect(Object.fromEntries(options)).toEqual({});
      expect({ ...recipient, ...Object.fromEntries(options) }).toEqual(
        recipient,
      );
    }
    for (const path of ["/play/first-light/4/mid/", "/result/"])
      expect(selectionRouteOptions(path, search).toString()).toBe(
        new URLSearchParams(search).toString(),
      );
  });
});
