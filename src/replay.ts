import { SONGS, makeChart, type Difficulty, type Lanes } from './chart';
import { Engine } from './engine';
import { transformChart, type Fader, type Shuffle } from './game-options';
import type { SharedResult } from './share';
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
}
const faders = ['off', 'in', 'in2', 'out', 'out2'];
const shuffles = ['off', 'mirror', 'random'];
export function validateReplay(raw: unknown): ReplayData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as ReplayData;
  if (
    r.version !== 1 ||
    !SONGS.some((s) => s.id === r.song) ||
    ![5, 7].includes(r.lanes) ||
    !['low', 'mid', 'high'].includes(r.difficulty) ||
    !r.options ||
    !Array.isArray(r.ops) ||
    r.ops.length > 12000 ||
    !Number.isFinite(r.end) ||
    r.end < 0 ||
    r.end > 600000
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
      op[2] < -2 ||
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
  };
}
export function replayEngine(r: ReplayData) {
  return new Engine(
    transformChart(
      makeChart(
        SONGS.find((s) => s.id === r.song)!,
        r.difficulty,
        r.lanes,
      ),
      r.lanes,
      r.options.shuffle,
      r.options.seed,
    ),
  );
}
export function applyReplayOp(engine: Engine, op: ReplayOp, sequence: number) {
  if (op[0] === 0)
    engine.input({ lane: op[3], time: op[2], down: !!op[4], sequence });
  else if (op[0] === 1) engine.update(op[2]);
}
export function replayMatches(r: ReplayData, result: SharedResult) {
  if (
    r.song !== result.song ||
    r.lanes !== result.lanes ||
    r.difficulty !== result.difficulty
  )
    return false;
  const engine = replayEngine(r);
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
  const packed = await transformed(
    new TextEncoder().encode(JSON.stringify(safe)),
    true,
  );
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
    return validateReplay(JSON.parse(new TextDecoder().decode(raw)));
  } catch {
    return null;
  }
}
