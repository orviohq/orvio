import { describe, it, expect } from 'vitest';
import { SONGS, makeChart } from '../src/chart';
import { Engine } from '../src/engine';
import { transformChart } from '../src/game-options';
import {
  validateReplay,
  encodeReplay,
  decodeReplay,
  replayMatches,
  replayEngine,
  applyReplayOp,
  type ReplayData,
  type ReplayOp,
} from '../src/replay';
function recorded() {
  const r: ReplayData = {
    version: 1,
    song: 'first-light',
    lanes: 5,
    difficulty: 'mid',
    options: { speed: 4, fader: 'in2', shuffle: 'random', seed: 123 },
    ops: [],
    end: 40000,
  };
  const notes = transformChart(makeChart(SONGS[0], 'mid', 5), 5, 'random', 123),
    engine = new Engine(notes);
  const inputs = notes
    .flatMap((n, i) =>
      i % 5 === 0
        ? []
        : [
            { t: n.time + (i % 7 === 0 ? 0.07 : 0), lane: n.lane, down: true },
            { t: n.end ?? n.time + 0.025, lane: n.lane, down: false },
          ],
    )
    .sort((a, b) => a.t - b.t);
  let seq = 0,
    index = 0;
  for (let t = 0; t < 40; t += 1 / 60) {
    while (index < inputs.length && inputs[index].t <= t) {
      const x = inputs[index++];
      r.ops.push([0, t * 1000, x.t, x.lane, x.down ? 1 : 0]);
      engine.input({ lane: x.lane, time: x.t, down: x.down, sequence: seq++ });
    }
    const before = engine.events.length;
    engine.update(t);
    if (engine.events.length !== before) r.ops.push([1, t * 1000, t]);
  }
  engine.update(9999);
  r.ops.push([1, 40000, 9999]);
  const result = {
    song: r.song,
    lanes: r.lanes,
    difficulty: r.difficulty,
    options: r.options,
    score: engine.score,
    accuracy: engine.sum / engine.total,
    combo: engine.maxCombo,
    judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
      (v) => engine.events.filter((e) => e.value === v).length,
    ),
  };
  return { r, engine, result };
}
describe('actual-input local replay', () => {
  it('roundtrips exact input float times and sparse engine ticks and reproduces every judgment', async () => {
    const { r, engine, result } = recorded();
    const encoded = await encodeReplay(r);
    expect(encoded.length).toBeLessThan(20000);
    const got = await decodeReplay(encoded);
    expect(got).toEqual(r);
    expect(replayMatches(got!, result)).toBe(true);
    const replay = replayEngine(got!);
    got!.ops.forEach((op, i) => applyReplayOp(replay, op, i));
    expect(replay.events).toEqual(engine.events);
    expect(replay.maxCombo).toBe(engine.maxCombo);
    expect(replay.score).toBe(engine.score);
  });
  it('keeps pauses, effect changes and initial seed but no key bindings, wall-clock dates or identity', async () => {
    const { r } = recorded();
    r.ops.unshift([2, 0, -0.1, 1], [3, 0, -0.1, 9, 'out2'], [2, 0, -0.1, 0]);
    const copy = validateReplay({ ...r, identity: 'discard', keys: ['KeyD'] });
    expect(copy).not.toHaveProperty('identity');
    expect(copy).not.toHaveProperty('keys');
    expect(await decodeReplay(await encodeReplay(copy!))).toEqual(copy);
  });
  it('rejects malformed, excessive or inconsistent input rather than manufacturing a replay from scores', async () => {
    const { r, result } = recorded();
    expect(replayMatches(r, { ...result, score: 1 })).toBe(false);
    expect(validateReplay({ ...r, ops: [[0, 1, 1, 99, 1]] })).toBeNull();
    expect(validateReplay({ ...r, end: Infinity })).toBeNull();
    expect(
      validateReplay({
        ...r,
        ops: [
          [1, 9, 9999],
          [1, 10, 1],
        ],
      }),
    ).toBeNull();
    expect(
      validateReplay({ ...r, ops: Array(12001).fill([1, 0, 0]) }),
    ).toBeNull();
    expect(await decodeReplay('bad%%')).toBeNull();
    expect(await decodeReplay('a'.repeat(120001))).toBeNull();
  });
});
