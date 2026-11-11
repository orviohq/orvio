// Phase 1 local-only record/replay implemented and tested; no owner attestation.
import {
  ALL_KEYS_CHART_KEYS,
  UNIFIED_CORE_VERSION,
  generateAllKeysRecordFromAnalysis,
} from "./chart-core/all-keys.mjs";
import { AUDIO_MAX_SECONDS } from "./audio-limits.mjs";
import { parseWavAnalysis } from "./fused-resampler.mjs";
import { difficultyForChart, type FamilyChartKey } from "./chart-difficulty";
import type { Note } from "./chart";

export type LocalAllKeysRecord = Awaited<
  ReturnType<typeof generateAllKeysRecordFromAnalysis>
>;

export type LocalAllKeysEnvelope = {
  version: 1;
  kind: "orvio-local-allkeys";
  sourceProvenance: "local-allkeys-v1";
  record: LocalAllKeysRecord;
};

export function localAllKeysIdentity(envelope: LocalAllKeysEnvelope): string {
  return `yt-local-allkeys-${envelope.record.videoId}-${envelope.record.audioSha256}-c${envelope.record.chartSetSha256}`;
}

export async function generateLocalAllKeysRecord({
  bytes,
  videoId,
  signal,
}: {
  bytes: ArrayBuffer;
  videoId: string;
  signal?: AbortSignal;
}): Promise<LocalAllKeysEnvelope> {
  if (!(bytes instanceof ArrayBuffer)) {
    throw new TypeError("bytes must be an ArrayBuffer");
  }
  if (typeof videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new TypeError("videoId must be an 11-character YouTube ID");
  }
  signal?.throwIfAborted();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  signal?.throwIfAborted();
  const audioSHA = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const parsed = parseWavAnalysis(bytes);
  signal?.throwIfAborted();
  const record = await generateAllKeysRecordFromAnalysis(
    parsed,
    videoId,
    audioSHA,
  );
  signal?.throwIfAborted();
  return {
    version: 1,
    kind: "orvio-local-allkeys",
    sourceProvenance: "local-allkeys-v1",
    record,
  };
}

// Validates cloned record structure, notes, metadata and chart hashes; audio bytes are not supplied here.
export async function validateLocalAllKeysRecord(
  raw: unknown,
  options?: { signal?: AbortSignal },
): Promise<LocalAllKeysEnvelope> {
  const copy: unknown = structuredClone(raw);
  options?.signal?.throwIfAborted();
  const object = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
  const exactKeys = (value: unknown, keys: readonly string[]) =>
    object(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
  const invalid: () => never = () => {
    throw new TypeError("Invalid local all-keys record");
  };
  if (
    !object(copy) ||
    !exactKeys(copy, ["version", "kind", "sourceProvenance", "record"])
  )
    invalid();
  const envelope = copy as Record<string, unknown>;
  if (
    envelope.version !== 1 ||
    envelope.kind !== "orvio-local-allkeys" ||
    envelope.sourceProvenance !== "local-allkeys-v1" ||
    !object(envelope.record)
  )
    invalid();
  const record = envelope.record as Record<string, unknown>;
  const hex = (value: unknown) =>
    typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  const config = JSON.stringify({
    mono: "left-to-right-mean",
    analysisSampleRate: 22050,
    hop: 512,
    window: 1024,
    onset: "table-stft-band-flux-c2-a35localfloor",
    selection: "nested-c2-high-gap0.10-burst8-a35poolfill-pace",
    grid: "none",
    decoration: "m17c-band-sustain-hold-chord-tail20",
    tailClipMargin: 0.2,
    lanePlacement:
      "a35-lanev3-budget-v1-adaptive-share-lru-guard120ms+jackrepair150-postpass-allkeys",
    highMode: "c2",
    sc: "a4-sc-chordcap30-hold-emphasis-v1",
    keys: "4,5,6,7,8",
  });
  if (
    record.version !== 3 ||
    typeof record.videoId !== "string" ||
    !/^[A-Za-z0-9_-]{11}$/.test(record.videoId) ||
    !hex(record.audioSha256) ||
    !hex(record.chartSetSha256)
  )
    invalid();
  if (
    (record.sampleRate !== 44100 && record.sampleRate !== 48000) ||
    typeof record.frames !== "number" ||
    !Number.isSafeInteger(record.frames) ||
    record.frames <= 0 ||
    record.frames > (record.sampleRate as number) * AUDIO_MAX_SECONDS
  )
    invalid();
  if (
    record.pipelineVersion !== "allkeys-pinned-pcm16-48k-v1" ||
    record.analyzerVersion !== UNIFIED_CORE_VERSION ||
    record.config !== config
  )
    invalid();
  if (
    !Array.isArray(record.lanes) ||
    record.lanes.length !== 5 ||
    ![4, 5, 6, 7, 8].every(
      (lane, index) => (record.lanes as unknown[])[index] === lane,
    )
  )
    invalid();
  if (
    !exactKeys(record.charts, ALL_KEYS_CHART_KEYS) ||
    !exactKeys(record.chartMetadata, ALL_KEYS_CHART_KEYS)
  )
    invalid();
  if (
    !exactKeys(record, [
      "version",
      "videoId",
      "audioSha256",
      "sampleRate",
      "estimatedBpm",
      "frames",
      "pipelineVersion",
      "analyzerVersion",
      "config",
      "lanes",
      "charts",
      "chartMetadata",
      "chartSetSha256",
    ]) ||
    typeof record.estimatedBpm !== "number" ||
    !Number.isFinite(record.estimatedBpm) ||
    record.estimatedBpm < 60 ||
    record.estimatedBpm > 180
  )
    invalid();
  const duration =
    Math.floor(
      (record.frames as number) / ((record.sampleRate as number) / 22050),
    ) / 22050;
  const charts = record.charts as Record<
    string,
    { notes: Note[]; sha256: string }
  >;
  const metadata = record.chartMetadata as Record<string, unknown>;
  const canonicalMetadata: Record<
    string,
    ReturnType<typeof difficultyForChart>
  > = {};
  const hash = async (value: unknown) => {
    options?.signal?.throwIfAborted();
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(value)),
    );
    options?.signal?.throwIfAborted();
    return Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  };
  for (const key of ALL_KEYS_CHART_KEYS) {
    options?.signal?.throwIfAborted();
    const chart = charts[key],
      lanes = Number(key.split(":")[0]);
    if (
      !exactKeys(chart, ["notes", "sha256"]) ||
      !hex(chart.sha256) ||
      !Array.isArray(chart.notes) ||
      !chart.notes.length ||
      chart.notes.length > 10000
    )
      invalid();
    const ids = new Set<number>(),
      laneUntil = new Map<number, number>();
    let previous = -Infinity;
    for (const note of chart.notes) {
      if (
        !object(note) ||
        !exactKeys(
          note,
          Object.hasOwn(note, "end")
            ? ["id", "time", "lane", "end"]
            : ["id", "time", "lane"],
        ) ||
        !Number.isInteger(note.id) ||
        ids.has(note.id) ||
        !Number.isInteger(note.lane) ||
        note.lane < 0 ||
        note.lane >= lanes ||
        !Number.isFinite(note.time) ||
        note.time < 0 ||
        note.time < previous ||
        note.time >= duration ||
        (laneUntil.get(note.lane) ?? -Infinity) >= note.time ||
        (Object.hasOwn(note, "end") &&
          (typeof note.end !== "number" ||
            !Number.isFinite(note.end) ||
            note.end <= note.time ||
            note.end > duration))
      )
        invalid();
      ids.add(note.id);
      previous = note.time;
      laneUntil.set(note.lane, note.end ?? note.time);
    }
    if ((await hash(chart.notes)) !== chart.sha256) invalid();
    const expected = difficultyForChart(
        chart.notes,
        duration,
        key as FamilyChartKey,
      ),
      actual = metadata[key];
    if (
      !object(actual) ||
      !exactKeys(actual, ["version", "family", "rating", "status"]) ||
      actual.version !== expected.version ||
      actual.family !== expected.family ||
      actual.status !== expected.status ||
      !object(actual.rating) ||
      !exactKeys(actual.rating, ["scale", "level"]) ||
      actual.rating.scale !== expected.rating?.scale ||
      actual.rating.level !== expected.rating?.level
    )
      invalid();
    canonicalMetadata[key] = expected;
  }
  record.chartMetadata = canonicalMetadata;
  if (
    (await hash({
      analyzer: record.analyzerVersion,
      config: record.config,
      charts: ALL_KEYS_CHART_KEYS.map((key: string) => [
        key,
        charts[key].sha256,
      ]),
      chartMetadata: record.chartMetadata,
    })) !== record.chartSetSha256
  )
    invalid();
  options?.signal?.throwIfAborted();
  return copy as LocalAllKeysEnvelope;
}

export async function selectLocalAllKeysChart(
  raw: unknown,
  lanes: 4 | 5 | 6 | 7 | 8,
  difficulty: "low" | "mid" | "high" | "sc",
  options?: { signal?: AbortSignal },
) {
  if (
    ![4, 5, 6, 7, 8].includes(lanes) ||
    !["low", "mid", "high", "sc"].includes(difficulty)
  ) {
    throw new TypeError("Invalid local all-keys chart selection");
  }
  const envelope = await validateLocalAllKeysRecord(raw, options);
  const identity = localAllKeysIdentity(envelope);
  const record = envelope.record;
  const frozenNotes = structuredClone(
    record.charts[`${lanes}:${difficulty}`].notes,
  ) as Note[];
  return { identity, record: envelope, lanes, difficulty, frozenNotes };
}
