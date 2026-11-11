import type { Song, Note, Difficulty, Lanes } from "./chart";
import type { ChartDifficultyMetadata } from "./chart-difficulty";
import {
  localAllKeysIdentity,
  validateLocalAllKeysRecord,
  type LocalAllKeysEnvelope,
} from "./local-allkeys-record";

export type LocalAllKeysItem = {
  song: Song;
  envelope: LocalAllKeysEnvelope;
};

const sources = new Map<string, LocalAllKeysItem>();
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
type Display = DeepReadonly<{
  count: number;
  metadata: ChartDifficultyMetadata | undefined;
}>;
const displays = new WeakMap<LocalAllKeysItem, Map<string, Display>>();
const missingDisplay: Display = Object.freeze({
  count: 0,
  metadata: undefined,
});

function freezeDisplay<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeDisplay(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}

export function hasLocalAllKeysSource(id: string): boolean {
  return sources.has(id);
}

export function localAllKeysVideoId(id: string): string | undefined {
  return sources.get(id)?.envelope.record.videoId;
}

export function localAllKeysDisplay(
  id: string,
  difficulty: Difficulty,
  lanes: Lanes,
): Display {
  const item = sources.get(id);
  if (!item) return missingDisplay;
  const key = `${lanes}:${difficulty}` as const;
  const record = item.envelope.record;
  if (!Object.hasOwn(record.charts, key)) return missingDisplay;
  let modes = displays.get(item);
  if (!modes) displays.set(item, (modes = new Map()));
  let display = modes.get(key);
  if (!display) {
    display = freezeDisplay({
      count: record.charts[key].notes.length,
      metadata: structuredClone(record.chartMetadata[key]),
    });
    modes.set(key, display);
  }
  return display;
}

export async function installLocalAllKeysSource(
  raw: unknown,
  title?: string,
  author?: string,
): Promise<LocalAllKeysItem> {
  const envelope = await validateLocalAllKeysRecord(raw);
  const record = envelope.record;
  const id = localAllKeysIdentity(envelope);
  const existing = sources.get(id);
  if (existing) return structuredClone(existing);
  const song: Song = {
    id,
    title: title || record.videoId,
    subtitle: author || "YouTube",
    bpm: record.estimatedBpm,
    root: 57,
    scale: [0, 2, 4, 7, 9],
    color: "#29d8ff",
    genre: "YOUTUBE",
    bars: 0,
  };
  const item: LocalAllKeysItem = { song, envelope };
  sources.set(id, item);
  return structuredClone(item);
}

export function localAllKeysSource(id: string): LocalAllKeysItem | undefined {
  const item = sources.get(id);
  return item ? structuredClone(item) : undefined;
}

export function localAllKeysNotes(
  id: string,
  difficulty: Difficulty,
  lanes: Lanes,
): Note[] | undefined {
  const chart =
    sources.get(id)?.envelope.record.charts[`${lanes}:${difficulty}`];
  return chart ? structuredClone(chart.notes) : undefined;
}

export function localAllKeysDuration(id: string): number | undefined {
  const record = sources.get(id)?.envelope.record;
  return record ? record.frames / record.sampleRate : undefined;
}
