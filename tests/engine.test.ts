import { describe, it, expect } from 'vitest';
import { Engine, judge, WINDOWS_MS, JUDGMENTS } from '../src/engine';
import { SONGS, makeChart, type Difficulty, type Lanes } from '../src/chart';
describe('timing and scoring', () => {
  it('covers all judgment categories symmetrically at boundaries', () => {
    WINDOWS_MS.forEach((w, i) => {
      expect(judge(w)).toBe(JUDGMENTS[i]);
      expect(judge(-w)).toBe(JUDGMENTS[i]);
    });
    expect(judge(151)).toBe(0);
  });
  it('scores perfect and mixed notes without incremental rounding', () => {
    const e = new Engine([
      { id: 0, lane: 0, time: 1 },
      { id: 1, lane: 0, time: 2 },
      { id: 2, lane: 1, time: 3 },
    ]);
    e.input({ lane: 0, time: 1, down: true, sequence: 0 });
    e.input({ lane: 0, time: 2.045, down: true, sequence: 1 });
    e.update(4);
    expect(e.score).toBe(633333);
    expect(e.combo).toBe(0);
    expect(e.maxCombo).toBe(2);
    expect(e.resolved).toBe(3);
  });
  it('ignores duplicate/out-of-order input sequence', () => {
    const e = new Engine([
      { id: 0, lane: 0, time: 1 },
      { id: 1, lane: 0, time: 2 },
    ]);
    e.input({ lane: 0, time: 1, down: true, sequence: 2 });
    e.input({ lane: 0, time: 2, down: true, sequence: 2 });
    expect(e.resolved).toBe(1);
  });
  it('holds award head and tail; early releases break', () => {
    const e = new Engine([
      { id: 0, lane: 0, time: 1, end: 2 },
      { id: 1, lane: 1, time: 3, end: 4 },
    ]);
    e.input({ lane: 0, time: 1, down: true, sequence: 0 });
    e.input({ lane: 0, time: 2, down: false, sequence: 1 });
    e.input({ lane: 1, time: 3, down: true, sequence: 2 });
    e.input({ lane: 1, time: 3.5, down: false, sequence: 3 });
    expect(e.score).toBe(750000);
    expect(e.breaks).toBe(1);
    expect(e.resolved).toBe(4);
  });
  it('all misses resolve once, including both hold endpoints', () => {
    const e = new Engine([{ id: 0, lane: 0, time: 1, end: 2 }]);
    e.update(10);
    e.update(11);
    expect(e.resolved).toBe(2);
    expect(e.score).toBe(0);
  });
  it('late hold releases resolve at MAX1 only once', () => {
    const e = new Engine([{ id: 0, lane: 0, time: 1, end: 2 }]);
    e.input({ lane: 0, time: 1, down: true, sequence: 0 });
    e.update(3);
    e.input({ lane: 0, time: 3, down: false, sequence: 1 });
    expect(e.resolved).toBe(2);
    expect(e.score).toBe(505000);
  });
});
describe('all 18 charts', () => {
  for (const s of SONGS)
    for (const d of ['low', 'mid', 'high'] as Difficulty[])
      for (const l of [5, 7] as Lanes[]) {
        it(`${s.id}/${d}/${l}: deterministic, playable, no collisions, perfect=1M`, () => {
          const n = makeChart(s, d, l);
          expect(n).toEqual(makeChart(s, d, l));
          expect(n.length).toBeGreaterThan(30);
          const e = new Engine(n);
          const inputs = n
            .flatMap((x) => [
              { lane: x.lane, time: x.time, down: true },
              { lane: x.lane, time: x.end ?? x.time + 0.03, down: false },
            ])
            .sort((a, b) => a.time - b.time || Number(a.down) - Number(b.down));
          inputs.forEach((i, sequence) => e.input({ ...i, sequence }));
          e.update(999);
          expect(e.score).toBe(1000000);
          expect(e.breaks).toBe(0);
          expect(e.resolved).toBe(e.total);
          for (let lane = 0; lane < l; lane++) {
            const ns = n.filter((x) => x.lane === lane);
            for (let i = 1; i < ns.length; i++)
              expect(
                ns[i].time - (ns[i - 1].end ?? ns[i - 1].time),
              ).toBeGreaterThan(0.025);
          }
        });
      }
});
