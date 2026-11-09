import { validFeverMetadata, type FeverReplayMetadata } from './fever';
import { packReplay, unpackReplay } from './replay-binary';
import {
  SONGS,
  makeChart,
  type Difficulty,
  type Lanes,
  type Note,
} from './chart';
import { Engine } from './engine';
import {
  FADERS,
  transformChart,
  type Fader,
  type Shuffle,
} from './game-options';
import { SHARED_SONGS, type SharedResult } from './share';
// wall milliseconds, original audio seconds. Omit update calls only when they
// changed no engine state. Preserve actual input order and exact float values.
export type ReplayOp =
  | [0, number, number, number, 0 | 1]
  | [1, number, number]
  | [2, number, number, 0 | 1]
  | [3, number, number, number, Fader];
export interface ReplayData {
  version: 1;
  song: SharedResult['song'];
  lanes: Lanes;
  difficulty: Difficulty;
  options: NonNullable<SharedResult['options']>;
  ops: ReplayOp[];
  end: number;
  // Seconds the audio anchor was held after session start when recorded.
  // Absent on pre-A5 replays, whose anchor was the fixed 0.15s lead-in.
  audioLeadIn?: number;
  fever?: FeverReplayMetadata;
}
export type RuntimeReplay = Omit<ReplayData, 'song'> & { song: string };
const faders: readonly string[] = FADERS;
const shuffles = ['off', 'mirror', 'random'];
export function validateReplay(raw: unknown): ReplayData | null {
  return validateRuntimeReplay(raw, (id) =>
    Object.hasOwn(SHARED_SONGS, id),
  ) as ReplayData | null;
}
export function validateRuntimeReplay(
  raw: unknown,
  allowed: (id: string) => boolean,
): RuntimeReplay | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as RuntimeReplay;
  if (
    (r.fever !== undefined && !validFeverMetadata(r.fever)) ||
    r.version !== 1 ||
    typeof r.song !== 'string' ||
    !allowed(r.song) ||
    ![4, 5, 6, 7, 8].includes(r.lanes) ||
    !['low', 'mid', 'high', 'sc'].includes(r.difficulty) ||
    !r.options ||
    !Array.isArray(r.ops) ||
    r.ops.length > 12000 ||
    !Number.isFinite(r.end) ||
    r.end < 0 ||
    r.end > 600000 ||
    (r.audioLeadIn !== undefined &&
      (!Number.isFinite(r.audioLeadIn) ||
        r.audioLeadIn < 0 ||
        r.audioLeadIn > 10))
  )
    return null;
  const o = r.options;
  if (
    !Number.isFinite(o.speed) ||
    o.speed < 1 ||
    o.speed > 9 ||
    !faders.includes(o.fader) ||
    !shuffles.includes(o.shuffle) ||
    !Number.isInteger(o.seed) ||
    o.seed < 0 ||
    o.seed > 0xffffffff
  )
    return null;
  let prev = 0;
  for (let i = 0; i < r.ops.length; i++) {
    const op = r.ops[i];
    if (
      !Array.isArray(op) ||
      ![0, 1, 2, 3].includes(op[0]) ||
      !Number.isFinite(op[1]) ||
      op[1] < prev ||
      op[1] > r.end ||
      !Number.isFinite(op[2]) ||
      op[2] < (r.audioLeadIn === undefined ? -2 : -(r.audioLeadIn + 1)) ||
      (op[2] > 600 &&
        !(op[0] === 1 && op[2] === 9999 && i === r.ops.length - 1))
    )
      return null;
    prev = op[1];
    if (
      op[0] === 0 &&
      (op.length !== 5 ||
        !Number.isInteger(op[3]) ||
        op[3] < 0 ||
        op[3] >= r.lanes ||
        ![0, 1].includes(op[4]))
    )
      return null;
    if (op[0] === 1 && op.length !== 3) return null;
    if (op[0] === 2 && (op.length !== 4 || ![0, 1].includes(op[3])))
      return null;
    if (
      op[0] === 3 &&
      (op.length !== 5 ||
        !Number.isFinite(op[3]) ||
        op[3] < 1 ||
        op[3] > 9 ||
        !faders.includes(op[4]))
    )
      return null;
  }
  return {
    version: 1,
    song: r.song,
    lanes: r.lanes,
    difficulty: r.difficulty,
    options: {
      speed: o.speed,
      fader: o.fader as Fader,
      shuffle: o.shuffle as Shuffle,
      seed: o.seed,
    },
    ops: r.ops.map((op) => [...op] as ReplayOp),
    end: r.end,
    ...(r.audioLeadIn !== undefined ? { audioLeadIn: r.audioLeadIn } : {}),
    ...(r.fever !== undefined
      ? {
          fever: {
            version: 1 as const,
            rulesId: r.fever.rulesId,
            auto: r.fever.auto,
          },
        }
      : {}),
  };
}
export function replayEngine(r: RuntimeReplay, frozenNotes?: Note[]) {
  return new Engine(
    transformChart(
      frozenNotes ??
        makeChart(
          SONGS.find((s) => s.id === r.song)!,
          r.difficulty,
          r.lanes,
        ),
      r.lanes,
      r.options.shuffle,
      r.options.seed,
    ),
    r.fever,
  );
}
export function applyReplayOp(engine: Engine, op: ReplayOp, sequence: number) {
  if (op[0] === 0)
    engine.input({ lane: op[3], time: op[2], down: !!op[4], sequence });
  else if (op[0] === 1) engine.update(op[2]);
}
export function replayMatches(
  r: RuntimeReplay,
  result: Omit<SharedResult, 'song'> & { song: string },
  frozenNotes?: Note[],
) {
  if (
    r.song !== result.song ||
    r.lanes !== result.lanes ||
    r.difficulty !== result.difficulty
  )
    return false;
  const engine = replayEngine(r, frozenNotes);
  r.ops.forEach((op, i) => applyReplayOp(engine, op, i));
  engine.update(9999);
  const counts = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
    (v) => engine.events.filter((e) => e.value === v).length,
  );
  return (
    engine.score === result.score &&
    Math.abs(engine.sum / engine.total - result.accuracy) < 0.011 &&
    engine.maxCombo === result.combo &&
    !!result.judgments &&
    counts.every((v, i) => v === result.judgments![i])
  );
}
async function transformed(bytes: Uint8Array, compress: boolean) {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(
      compress
        ? new CompressionStream('deflate')
        : new DecompressionStream('deflate'),
    );
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1000000) {
      await reader.cancel();
      throw new Error('Replay too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
export async function encodeReplay(r: ReplayData): Promise<string> {
  const safe = validateReplay(r);
  if (!safe) throw new Error('Invalid replay');
  const packed = await transformed(packReplay(safe), true);
  let binary = '';
  for (let i = 0; i < packed.length; i += 8192)
    binary += String.fromCharCode(...packed.subarray(i, i + 8192));
  const out = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (out.length > 120000) throw new Error('Replay link too large');
  return out;
}
export async function decodeReplay(text: string): Promise<ReplayData | null> {
  try {
    if (text.length > 120000 || !text || !/^[A-Za-z0-9_-]+$/.test(text))
      return null;
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const raw = await transformed(
      Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      false,
    );
    return validateReplay(
      raw[0] === 82 && raw[1] === 50
        ? unpackReplay(raw)
        : JSON.parse(new TextDecoder().decode(raw)),
    );
  } catch {
    return null;
  }
}
