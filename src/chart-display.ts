import {
  makeChart,
  duration,
  type Song,
  type Difficulty,
  type Lanes,
} from './chart';
import { externalSource } from './external-catalog';
import {
  difficultyForChart,
  type ChartDifficultyMetadata,
} from './chart-difficulty';
import type { PlayableSourceRecord } from './playable-source';
interface Display {
  count: number;
  metadata: ChartDifficultyMetadata | undefined;
}
// Display reads immutable pinned notes without copying them. Playback keeps its
// separate makeChart clone, transformations and integrity gates.
const cache = new WeakMap<
  Song,
  { record: PlayableSourceRecord | undefined; modes: Map<string, Display> }
>();
export function chartDisplay(
  song: Song,
  diff: Difficulty,
  lanes: Lanes,
): Display {
  const record = externalSource(song.id)?.record;
  let entry = cache.get(song);
  if (!entry || entry.record !== record) {
    entry = { record, modes: new Map() };
    cache.set(song, entry);
  }
  const key = `${lanes}:${diff}` as const;
  const prior = entry.modes.get(key);
  if (prior) return prior;
  const notes = record
    ? ((lanes === 5 || lanes === 7
        ? record.charts[`${lanes}:${diff}`]?.notes
        : undefined) ?? [])
    : makeChart(song, diff, lanes);
  const value = {
    count: notes.length,
    metadata: notes.length
      ? ((lanes === 5 || lanes === 7
          ? record?.chartMetadata?.[`${lanes}:${diff}`]
          : undefined) ?? difficultyForChart(notes, duration(song), key))
      : undefined,
  };
  entry.modes.set(key, value);
  return value;
}
