import { AUDIO_MAX_SECONDS } from './audio-limits.mjs';
import type { Note, Difficulty, Lanes } from './chart';
import {
  validDifficultyMetadata,
  familyForKey,
  type ChartDifficultyMetadata,
} from './chart-difficulty';
export type ChartKey = `${Lanes}:${Difficulty}`;
export interface SourceRecord {
  /** Local-worker provenance, not a server/official derivation attestation. */
  sourceProvenance?: 'local-current35-v1';
  version: 1;
  videoId: string;
  audioSha256: string;
  /** Optional new-pin binding; absent on immutable legacy records. */
  manifestSha256?: string;
  sampleRate: number;
  estimatedBpm: number;
  frames: number;
  pipelineVersion: string;
  analyzerVersion: string;
  config: string;
  chartSetSha256?: string;
  charts: Record<
    `${Lanes}:${Exclude<Difficulty, 'sc'>}`,
    { notes: Note[]; sha256: string }
  > &
    Partial<Record<`${Lanes}:sc`, { notes: Note[]; sha256: string }>>;
  chartMetadata?: Partial<Record<ChartKey, ChartDifficultyMetadata>>;
}
const hash = /^[a-f0-9]{64}$/;
const keys: ChartKey[] = [
  '5:low',
  '5:mid',
  '5:high',
  '7:low',
  '7:mid',
  '7:high',
];
/** Validate every source-bound chart before writing any part of its six-mode pin. */
export function validSourceRecord(raw: unknown): raw is SourceRecord {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as SourceRecord;
  if (
    (r.sourceProvenance !== undefined &&
      r.sourceProvenance !== 'local-current35-v1') ||
    r.version !== 1 ||
    !Number.isFinite(r.estimatedBpm) ||
    r.estimatedBpm < 0 ||
    r.estimatedBpm > 400 ||
    !/^[A-Za-z0-9_-]{11}$/.test(r.videoId) ||
    !hash.test(r.audioSha256) ||
    (r.manifestSha256 !== undefined &&
      (typeof r.manifestSha256 !== 'string' || !hash.test(r.manifestSha256))) ||
    !Number.isInteger(r.frames) ||
    r.frames <= 0 ||
    !Number.isInteger(r.sampleRate) ||
    r.sampleRate < 8000 ||
    r.sampleRate > 192000 ||
    r.frames / r.sampleRate > AUDIO_MAX_SECONDS ||
    typeof r.pipelineVersion !== 'string' ||
    !r.pipelineVersion ||
    r.pipelineVersion.length > 128 ||
    typeof r.analyzerVersion !== 'string' ||
    !r.analyzerVersion ||
    r.analyzerVersion.length > 128 ||
    typeof r.config !== 'string' ||
    r.config.length > 4096 ||
    (r.chartSetSha256 !== undefined && !hash.test(r.chartSetSha256)) ||
    !r.charts
  )
    return false;
  for (const key of presentChartKeys(r)) {
    const c = r.charts[key],
      lanes = Number(key[0]);
    if (
      !c ||
      !hash.test(c.sha256) ||
      !Array.isArray(c.notes) ||
      c.notes.length === 0 ||
      c.notes.length > 10000
    )
      return false;
    if (
      r.chartMetadata &&
      (!validDifficultyMetadata(r.chartMetadata[key]) ||
        r.chartMetadata[key]!.family !== familyForKey(key))
    )
      return false;
    const ids = new Set<number>();
    let previous = -Infinity;
    for (const n of c.notes) {
      if (
        !n ||
        !Number.isInteger(n.id) ||
        ids.has(n.id) ||
        !Number.isInteger(n.lane) ||
        n.lane < 0 ||
        n.lane >= lanes ||
        !Number.isFinite(n.time) ||
        n.time < 0 ||
        n.time < previous ||
        n.time >= r.frames / r.sampleRate ||
        (n.end !== undefined &&
          (!Number.isFinite(n.end) ||
            n.end <= n.time ||
            n.end > r.frames / r.sampleRate))
      )
        return false;
      ids.add(n.id);
      previous = n.time;
    }
  }
  return true;
}
export function recordKey(
  record: Pick<SourceRecord, 'videoId' | 'audioSha256' | 'chartSetSha256'>,
) {
  return `${record.videoId}:${record.audioSha256}${record.chartSetSha256 ? `:chart:${record.chartSetSha256}` : ''}`;
}
export type AudioMatch = 'exact' | 'source-changed';
/** A changed artifact is never permission to regenerate or overwrite the saved chart. */
export function matchAudio(record: SourceRecord, sha256: string): AudioMatch {
  return record.audioSha256 === sha256 ? 'exact' : 'source-changed';
}
export async function verifyChartHashes(
  record: SourceRecord,
): Promise<boolean> {
  if (!validSourceRecord(record)) return false;
  if (
    record.chartSetSha256 !== undefined &&
    record.chartSetSha256 !== (await chartSetHash(record))
  )
    return false;
  for (const key of presentChartKeys(record)) {
    const bytes = new TextEncoder().encode(
      JSON.stringify(record.charts[key]!.notes),
    );
    const actual = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    if (actual !== record.charts[key]!.sha256) return false;
  }
  return true;
}

/** Versioned chart identity does not change the source audio identity. */
export async function chartSetHash(record: SourceRecord): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      analyzer: record.analyzerVersion,
      config: record.config,
      charts: presentChartKeys(record).map((key) => [
        key,
        record.charts[key]!.sha256,
      ]),
      ...(record.chartMetadata ? { chartMetadata: record.chartMetadata } : {}),
    }),
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}

export function presentChartKeys(record: SourceRecord): ChartKey[] {
  return [
    ...keys,
    ...(['5:sc', '7:sc'] as const).filter(
      (key) => record.charts[key] !== undefined,
    ),
  ];
}
