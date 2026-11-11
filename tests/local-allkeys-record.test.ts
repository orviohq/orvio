import { expect, test } from "vitest";
import { makePcm16StereoWav, sha256Hex } from "./youtube-direct-fixture";
import {
  generateLocalAllKeysRecord,
  localAllKeysIdentity,
  selectLocalAllKeysChart,
  validateLocalAllKeysRecord,
} from "../src/local-allkeys-record";
import { verifyLocalAllKeysReplay } from "../src/local-allkeys-replay";
import { replayEngine, applyReplayOp, type RuntimeReplay } from "../src/replay";
import { generateRecordFromAnalysis } from "../src/chart-core/all-keys.mjs";
import { parseWavAnalysis } from "../src/fused-resampler.mjs";
import {
  installLocalAllKeysSource,
  localAllKeysSource,
} from "../src/local-allkeys-catalog";

test("generates all twenty charts without changing caller bytes", async () => {
  const frames = 12 * 48000;
  const samples = new Int16Array(frames * 2);
  for (let frame = 0; frame < frames; frame++) {
    const time = (frame % 19200) / 48000;
    const sample = Math.round(
      16000 * Math.exp(-time * 40) * Math.sin(2 * Math.PI * 220 * time),
    );
    samples[frame * 2] = samples[frame * 2 + 1] = sample;
  }
  const { bytes } = makePcm16StereoWav({ sampleRate: 48000, frames, samples });
  const original = bytes.slice();
  const envelope = await generateLocalAllKeysRecord({
    bytes: bytes.buffer as ArrayBuffer,
    videoId: "AAAAAAAAAAA",
  });
  const { record } = envelope;
  const installed = await installLocalAllKeysSource(envelope, "Fixture", "QA");
  const reinstalled = await installLocalAllKeysSource(envelope, "Replacement", "Other");
  expect(reinstalled.song.title).toBe("Fixture");
  expect(reinstalled.song.subtitle).toBe("QA");
  expect(reinstalled.song.id).toBe(installed.song.id);
  const storedNoteId = installed.envelope.record.charts["4:low"].notes[0].id;
  installed.envelope.record.charts["4:low"].notes[0].id += 1;
  expect(localAllKeysSource(installed.song.id)?.envelope.record.charts["4:low"].notes[0].id)
    .toBe(storedNoteId);
  expect(Object.keys(record.charts)).toHaveLength(20);
  expect(record.lanes).toEqual([4, 5, 6, 7, 8]);
  expect(record.version).toBe(3);
  expect(bytes).toEqual(original);
  const validated = await validateLocalAllKeysRecord(envelope);
  expect(validated).toEqual(envelope);
  expect(validated).not.toBe(envelope);
  expect(validated.record.charts["4:low"].notes).not.toBe(
    record.charts["4:low"].notes,
  );
  const originalId = record.charts["4:low"].notes[0].id;
  validated.record.charts["4:low"].notes[0].id += 1;
  expect(record.charts["4:low"].notes[0].id).toBe(originalId);
  const selected = await selectLocalAllKeysChart(envelope, 4, "low");
  expect(selected.record.version).toBe(1);
  expect(selected.record.kind).toBe("orvio-local-allkeys");
  await expect(validateLocalAllKeysRecord(selected.record)).resolves.toEqual(selected.record);
  expect(selected.frozenNotes).toEqual(record.charts["4:low"].notes);
  expect(selected.frozenNotes).not.toBe(selected.record.record.charts["4:low"].notes);
  expect(selected.frozenNotes).not.toBe(record.charts["4:low"].notes);
  expect(selected.record).not.toBe(record);
  selected.frozenNotes[0].id += 1;
  expect(selected.record.record.charts["4:low"].notes[0].id).toBe(originalId);
  expect(record.charts["4:low"].notes[0].id).toBe(originalId);
  const badNotes = structuredClone(envelope);
  badNotes.record.charts["4:low"].notes[0].time = -1;
  const badHash = structuredClone(envelope);
  badHash.record.charts["4:low"].sha256 = "0".repeat(64);
  const badProvenance = {
    ...structuredClone(envelope),
    sourceProvenance: "remote",
  };
  const missingChart = structuredClone(envelope);
  Reflect.deleteProperty(missingChart.record.charts, "4:low");
  for (const corrupted of [badNotes, badHash, badProvenance, missingChart]) {
    await expect(validateLocalAllKeysRecord(corrupted)).rejects.toThrow();
  }
  const replay: RuntimeReplay = {
    version: 1,
    song: localAllKeysIdentity(envelope),
    lanes: 4,
    difficulty: "low",
    options: { speed: 3, fader: "off", shuffle: "off", seed: 0 },
    ops: [
      [3, 0, 0, 4, "off"],
      [1, 100, 9999],
    ],
    end: 100,
  };
  for (const lanes of [4, 5, 6, 7, 8] as const)
    for (const difficulty of ["low", "mid", "high", "sc"] as const) {
      const input = {
        ...structuredClone(replay),
        lanes,
        difficulty,
        score: -123,
        result: { score: -456 },
      };
      const verified = await verifyLocalAllKeysReplay(envelope, input);
      const engine = replayEngine(verified.replay, verified.frozenNotes);
      verified.replay.ops.forEach((op, index) =>
        applyReplayOp(engine, op, index),
      );
      engine.update(9999);
      expect(verified.result).toEqual({
        song: replay.song,
        lanes,
        difficulty,
        score: engine.score,
        accuracy: engine.total ? engine.sum / engine.total : 0,
        combo: engine.maxCombo,
        judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
          (value) =>
            engine.events.filter((event) => event.value === value).length,
        ),
        options: { ...replay.options, speed: 4 },
      });
      expect(verified.identity).toBe(replay.song);
      expect(localAllKeysIdentity(verified.record)).toBe(replay.song);
      expect(verified.replay).not.toHaveProperty("score");
      expect(verified.replay).not.toHaveProperty("result");
      expect(verified.replay.ops).not.toBe(input.ops);
      const key = `${lanes}:${difficulty}`,
        id = record.charts[key].notes[0].id;
      expect(verified.frozenNotes).toEqual(record.charts[key].notes);
      expect(verified.frozenNotes).not.toBe(
        verified.record.record.charts[key].notes,
      );
      expect(verified.frozenNotes).not.toBe(record.charts[key].notes);
      verified.frozenNotes[0].id += 1;
      expect(verified.record.record.charts[key].notes[0].id).toBe(id);
      expect(record.charts[key].notes[0].id).toBe(id);
    }
  await expect(
    verifyLocalAllKeysReplay(envelope, { ...replay, song: "wrong-song" }),
  ).rejects.toThrow();
  await expect(
    verifyLocalAllKeysReplay(envelope, { ...replay, ops: [[0, 0, 0, 4, 1]] }),
  ).rejects.toThrow();
  for (const [field, value] of [
    ["chartSetSha256", "0".repeat(64)],
    ["lanes", [4, 5, 6, 7]],
    ["config", "{}"],
    [
      "chartMetadata",
      {
        ...record.chartMetadata,
        "4:low": { ...record.chartMetadata["4:low"], family: "SC" },
      },
    ],
  ] as const) {
    const corrupted = structuredClone(envelope);
    Object.assign(corrupted.record, { [field]: value });
    await expect(validateLocalAllKeysRecord(corrupted)).rejects.toThrow();
  }
  await expect(
    generateLocalAllKeysRecord({
      bytes: bytes.buffer as ArrayBuffer,
      videoId: "invalid",
    }),
  ).rejects.toThrow();
  await expect(
    generateLocalAllKeysRecord({
      bytes: new ArrayBuffer(44),
      videoId: "AAAAAAAAAAA",
    }),
  ).rejects.toThrow();
  const controller = new AbortController(),
    reason = new Error("pre-aborted");
  controller.abort(reason);
  const options = { signal: controller.signal };
  await expect(
    generateLocalAllKeysRecord({
      bytes: bytes.buffer as ArrayBuffer,
      videoId: "AAAAAAAAAAA",
      ...options,
    }),
  ).rejects.toBe(reason);
  await expect(validateLocalAllKeysRecord(envelope, options)).rejects.toBe(
    reason,
  );
  await expect(
    verifyLocalAllKeysReplay(envelope, replay, options),
  ).rejects.toBe(reason);
  const legacy = await generateRecordFromAnalysis(
    parseWavAnalysis(bytes.buffer as ArrayBuffer),
    "AAAAAAAAAAA",
    sha256Hex(bytes),
  );
  expect(legacy.analyzerVersion).not.toBe(record.analyzerVersion);
  expect(record.audioSha256).toBe(sha256Hex(bytes));
  for (const key of Object.keys(legacy.charts))
    expect(record.charts[key].notes).toEqual(legacy.charts[key].notes);
});
