import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chartFeatures,
  rateFeatures,
  rateDifficulty,
  RATING_REFS,
} from '../src/chart-rating.mjs';

const tap = (time, lane) => ({ id: 0, time, lane });
const hold = (time, lane, len) => ({ id: 0, time, lane, end: time + len });

test('deterministic: same chart, same rating', () => {
  const notes = [tap(0.5, 0), tap(0.5, 1), hold(1.0, 2, 0.8), tap(1.5, 3)];
  const a = rateDifficulty(notes, 10, 'standard');
  const b = rateDifficulty(structuredClone(notes), 10, 'standard');
  assert.equal(a, b);
  assert.ok(Number.isInteger(a) && a >= 1 && a <= 15);
});
test('bounds: empty-ish and extreme charts clamp to 1..15', () => {
  assert.equal(rateDifficulty([tap(1, 0)], 120, 'standard'), 1);
  const dense = [];
  for (let t = 0; t < 100; t += 0.05)
    for (const l of [0, 1, 2])
      dense.push(
        l === 0 && Math.round(t * 20) % 10 === 0 ? hold(t, l, 0.3) : tap(t, l),
      );
  assert.equal(rateDifficulty(dense, 100, 'standard'), 15);
  assert.equal(rateDifficulty(dense, 100, 'sc'), 15);
});
test('monotone in density on standard scale', () => {
  const mk = (step) => {
    const n = [];
    for (let t = 0; t < 60; t += step) n.push(tap(t, Math.floor(t * 7) % 5));
    return n;
  };
  const low = rateDifficulty(mk(1.0), 60, 'standard');
  const mid = rateDifficulty(mk(0.5), 60, 'standard');
  const high = rateDifficulty(mk(0.25), 60, 'standard');
  assert.ok(low < mid && mid < high, `${low} < ${mid} < ${high}`);
});
test('holds and chords raise the rating', () => {
  const base = [];
  for (let t = 0; t < 60; t += 0.5) base.push(tap(t, Math.floor(t * 7) % 5));
  const withHolds = base.map((n, i) =>
    i % 10 === 0 ? hold(n.time, n.lane, 1.0) : n,
  );
  const withChords = base.flatMap((n, i) =>
    i % 8 === 0 ? [n, tap(n.time, (n.lane + 2) % 5)] : [n],
  );
  const r = rateDifficulty(base, 60, 'standard');
  assert.ok(rateDifficulty(withHolds, 60, 'standard') >= r);
  assert.ok(rateDifficulty(withChords, 60, 'standard') > r);
});
test('sc scale tolerates more density than standard', () => {
  const n = [];
  for (let t = 0; t < 60; t += 0.12) n.push(tap(t, Math.floor(t * 7) % 5));
  assert.ok(rateDifficulty(n, 60, 'sc') <= rateDifficulty(n, 60, 'standard'));
});
test('invalid inputs throw, unknown scale throws', () => {
  assert.throws(() => rateDifficulty([], 10, 'standard'));
  assert.throws(() => rateDifficulty([tap(1, 0)], 0, 'standard'));
  assert.throws(() => rateFeatures(chartFeatures([tap(1, 0)], 10), 'djmax'));
});
test('feature extraction counts chords/holds/jacks exactly', () => {
  const f = chartFeatures(
    [tap(1, 0), tap(1, 1), hold(2, 2, 0.5), tap(2.1, 0), tap(2.2, 0)],
    10,
  );
  assert.equal(f.notes, 5);
  assert.equal(f.chordShare, 2 / 5);
  assert.ok(Math.abs(f.holdTimeShare - 0.05) < 1e-9);
  assert.equal(f.jackRate, 1 / 5); // 2.1 follows 1.0 on lane 0 by 1.1s (no); 2.2 follows 2.1 by 0.1 (yes)
  assert.ok(Math.abs(f.nps - 0.5) < 1e-9);
});
