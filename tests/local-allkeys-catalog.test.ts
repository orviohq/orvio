import { beforeAll, expect, test, vi } from "vitest";
import { SONGS, duration, makeChart, type Note } from "../src/chart";
import {
  hasLocalAllKeysSource,
  installLocalAllKeysSource,
  localAllKeysDisplay,
  localAllKeysNotes,
  localAllKeysSource,
  localAllKeysVideoId,
} from "../src/local-allkeys-catalog";
import { localAllKeysIdentity } from "../src/local-allkeys-record";
import { makeLocalAllKeysCatalogFixture } from "./local-allkeys-catalog-fixture";

let row: Awaited<ReturnType<typeof makeLocalAllKeysCatalogFixture>>;
beforeAll(async () => {
  row = await makeLocalAllKeysCatalogFixture();
  expect(Object.keys(row).sort()).toEqual(["envelope", "identity"]);
  expect(row.identity).toBe(localAllKeysIdentity(row.envelope));
  expect(row.envelope.record.videoId).toBe("synthCat001");
  expect(row.envelope.record.sampleRate).toBe(48000);
  expect(row.envelope.record.frames).toBe(12 * 48000);
  const charts = Object.values<{ notes: Note[] }>(row.envelope.record.charts);
  expect(charts).toHaveLength(20);
  for (const chart of charts) expect(chart.notes.length).toBeGreaterThan(0);
  const holds = charts.reduce(
    (count, chart) =>
      count + chart.notes.filter((note) => note.end !== undefined).length,
    0,
  );
  expect(holds).toBeGreaterThan(0);
  console.info("Synthetic catalog fixture", {
    charts: charts.length,
    holds,
    audioSha256: row.envelope.record.audioSha256,
    chartSetSha256: row.envelope.record.chartSetSha256,
  });
  const item = await installLocalAllKeysSource(row.envelope);
  expect(item.song.id).toBe(row.identity);
});

test("genuine 20-chart display clones detached metadata once, never envelopes or notes", () => {
  const clone = vi.spyOn(globalThis, "structuredClone");
  try {
    for (const lanes of [4, 5, 6, 7, 8] as const) {
      for (const diff of ["low", "mid", "high", "sc"] as const) {
        const key = `${lanes}:${diff}` as const;
        const display = localAllKeysDisplay(row.identity, diff, lanes);
        expect(display).toEqual({
          count: row.envelope.record.charts[key].notes.length,
          metadata: row.envelope.record.chartMetadata[key],
        });
        expect(Object.keys(display).sort()).toEqual(["count", "metadata"]);
        expect(display.metadata).not.toBe(
          row.envelope.record.chartMetadata[key],
        );
        expect(Object.isFrozen(display)).toBe(true);
        expect(Object.isFrozen(display.metadata)).toBe(true);
        expect(Object.isFrozen(display.metadata!.rating)).toBe(true);
        for (let i = 0; i < 16; i++) {
          expect(localAllKeysDisplay(row.identity, diff, lanes)).toBe(display);
          expect(hasLocalAllKeysSource(row.identity)).toBe(true);
          expect(localAllKeysVideoId(row.identity)).toBe(
            row.envelope.record.videoId,
          );
        }
      }
    }
    expect(clone).toHaveBeenCalledTimes(20);
    for (const [input] of clone.mock.calls) {
      if (typeof input !== "object" || input === null)
        throw new TypeError(
          "Expected structuredClone input to be a non-null object",
        );
      expect(Object.keys(input).sort()).toEqual([
        "family",
        "rating",
        "status",
        "version",
      ]);
    }
  } finally {
    clone.mockRestore();
  }
});

test("readonly display and detached playback/source/install copies cannot poison the catalog", async () => {
  const display = localAllKeysDisplay(row.identity, "low", 4);
  expect(() => Object.assign(display, { count: -1 })).toThrow(TypeError);
  expect(() => Object.assign(display.metadata!, { family: "SC" })).toThrow(
    TypeError,
  );
  expect(() => Object.assign(display.metadata!.rating!, { level: -1 })).toThrow(
    TypeError,
  );
  const item = await installLocalAllKeysSource(row.envelope, "duplicate");
  item.envelope.record.videoId = "poison";
  item.envelope.record.charts["4:low"].notes[0].time = -100;
  const source = localAllKeysSource(row.identity)!;
  source.envelope.record.chartMetadata["4:low"].rating!.level = -1;
  source.envelope.record.charts["4:low"].notes.length = 0;
  const notes = localAllKeysNotes(row.identity, "low", 4)!;
  notes[0].time = -200;
  expect(localAllKeysDisplay(row.identity, "low", 4)).toBe(display);
  expect(localAllKeysSource(row.identity)!.envelope).toEqual(row.envelope);
  expect(localAllKeysNotes(row.identity, "low", 4)).toEqual(
    row.envelope.record.charts["4:low"].notes,
  );
  expect(localAllKeysVideoId(row.identity)).toBe(row.envelope.record.videoId);
});

test("unknown display, scalar, existence and clone reads fail closed", () => {
  expect(hasLocalAllKeysSource("unknown")).toBe(false);
  expect(localAllKeysVideoId("unknown")).toBeUndefined();
  expect(localAllKeysSource("unknown")).toBeUndefined();
  expect(localAllKeysNotes("unknown", "low", 4)).toBeUndefined();
  expect(localAllKeysDisplay("unknown", "low", 4)).toEqual({
    count: 0,
    metadata: undefined,
  });
});

const unknownLocalSong = {
  ...SONGS[0],
  id: "yt-local-allkeys-unknown",
};

test.each(["low", "mid", "high", "sc"] as const)(
  "unknown local source fails closed for %s across all lane counts",
  (difficulty) => {
    for (const lanes of [4, 5, 6, 7, 8] as const) {
      expect(makeChart(SONGS[0], difficulty, lanes).length).toBeGreaterThan(0);
      expect(makeChart(unknownLocalSong, difficulty, lanes)).toEqual([]);
    }
  },
);

test("unknown local source duration fails closed", () => {
  expect(duration(SONGS[0])).toBeGreaterThan(0);
  expect(duration(unknownLocalSong)).toBe(0);
});
