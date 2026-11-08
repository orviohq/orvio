import { it, expect } from 'vitest';
import {
  FeverTracker,
  CURRENT_FEVER,
  validFeverMetadata,
  type FeverRules,
} from '../src/fever';
import { Engine, JUDGMENTS } from '../src/engine';
import { packReplay, unpackReplay } from '../src/replay-binary';
import {
  replayEngine,
  applyReplayOp,
  validateReplay,
  type ReplayData,
} from '../src/replay';
// Arbitrary test coefficients exercise mechanics. They are NOT DJMAX measurements.
const fixture = (): FeverRules => ({
  id: 'test-only-not-djmax',
  threshold: 3,
  chargeByJudgment: Object.fromEntries(
    JUDGMENTS.map((v) => [v, v === 0 ? 0 : 1]),
  ) as any,
  headWeight: 1,
  tailWeight: 1,
  holdTicks: { seconds: 0.25, phase: 0.25, charge: 1, combo: 1 },
  thresholdNote: 'after',
  overflow: 'carry',
  breakStage: 1,
  breakCharge: 'reset',
  breakHolds: 'keep',
});
const ev = (sequence: number, time: number, value = 100, extra = {}) =>
  ({ sequence, time, value, noteId: sequence, tail: false, ...extra }) as any;
it('the earlier pending rules ID remains frozen and never becomes an active fever', () => {
  const f = new FeverTracker({
    ...CURRENT_FEVER,
    rulesId: 'djmax-current-pending-v1',
  });
  f.judgment(ev(0, 1));
  expect(f.status).toBe('pending');
  expect(f.stage).toBe(1);
  expect(f.charge).toBe(0);
  expect(f.displayCombo).toBe(1);
  expect(validFeverMetadata({ ...CURRENT_FEVER, rulesId: 'invented' })).toBe(
    false,
  );
});
it('explicit test-only threshold and note-order policy drives stage capped at5, independent combo', () => {
  const f = new FeverTracker(CURRENT_FEVER, fixture());
  for (let i = 0; i < 16; i++) f.judgment(ev(i, i));
  expect(f.stage).toBe(5);
  expect(f.activations).toBe(5);
  expect(f.charge).toBe(1);
  expect(f.displayCombo).toBeGreaterThan(16);
  const a = new FeverTracker(CURRENT_FEVER, {
    ...fixture(),
    thresholdNote: 'before',
  });
  for (let i = 0; i < 3; i++) a.judgment(ev(i, i));
  const b = new FeverTracker(CURRENT_FEVER, fixture());
  for (let i = 0; i < 3; i++) b.judgment(ev(i, i));
  expect(a.displayCombo).toBe(4);
  expect(b.displayCombo).toBe(3);
});
it('hold clock journal is identical across frame batches; no advance on paused time, BREAK resets only configured state', () => {
  const run = (times: number[]) => {
    const f = new FeverTracker(CURRENT_FEVER, fixture());
    f.judgment(ev(0, 0, 100, { holdEnd: 2 }));
    for (const t of times) f.advance(t);
    return f;
  };
  const a = run([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]),
    b = run([1.75]);
  expect(a.journal).toEqual(b.journal);
  const frozen = structuredClone(a.journal);
  a.advance(1.75);
  expect(a.journal).toEqual(frozen);
  a.judgment(ev(1, 1.8, 0));
  expect(a.stage).toBe(1);
  expect(a.charge).toBe(0);
  expect(a.displayCombo).toBe(0);
  expect(new FeverTracker(CURRENT_FEVER, fixture()).journal).toEqual([]);
});
it('ON/OFF production rules leave score/accuracy/raw combo/judgment events unchanged', () => {
  const notes = [
      { id: 0, time: 1, lane: 0 },
      { id: 1, time: 2, lane: 1, end: 3 },
    ],
    a = new Engine(notes),
    b = new Engine(notes, CURRENT_FEVER);
  for (const e of [a, b]) {
    e.input({ sequence: 0, time: 1, lane: 0, down: true });
    e.input({ sequence: 1, time: 2, lane: 1, down: true });
    e.input({ sequence: 2, time: 3, lane: 1, down: false });
  }
  expect(a.events).toEqual(b.events);
  expect(a.score).toBe(1000000);
  expect(b.score).toBe(a.score);
  expect(b.combo).toBe(a.combo);
  expect(b.fever.journal.filter((e) => e.kind === 'judgment')).toHaveLength(
    b.events.length,
  );
  expect(b.fever.journal.some((e) => e.kind === 'hold-tick')).toBe(true);
  const off = new FeverTracker({ ...CURRENT_FEVER, auto: false }, fixture());
  for (let i = 0; i < 10; i++) off.judgment(ev(i, i));
  expect(off.stage).toBe(1);
  expect(off.displayCombo).toBe(10);
});
it('new replay rule metadata roundtrips exact; old bytes unchanged and absent rules stay legacy-off', () => {
  const r: ReplayData = {
    version: 1,
    song: 'first-light',
    lanes: 5,
    difficulty: 'low',
    options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 123 },
    ops: [[0, 1000, 1, 0, 1]],
    end: 1100,
  };
  const original = packReplay(r),
    old = unpackReplay(original);
  expect(packReplay(old)).toEqual(original);
  expect(replayEngine(old).fever.status).toBe('off');
  const current = { ...r, fever: CURRENT_FEVER };
  expect(unpackReplay(packReplay(current))).toEqual(current);
  expect(validateReplay(current)).toEqual(current);
  const a = replayEngine(current),
    b = replayEngine(unpackReplay(packReplay(current)));
  current.ops.forEach((op, i) => {
    applyReplayOp(a, op, i);
    applyReplayOp(b, op, i);
  });
  expect(a.fever.journal).toEqual(b.fever.journal);
  expect(a.events).toEqual(b.events);
  expect(
    validateReplay({ ...r, fever: { ...CURRENT_FEVER, rulesId: 'unknown' } }),
  ).toBeNull();
});

it('approved Orvio rules advance automatically to x5 without a score bonus and keep the pending ID frozen', () => {
  const f = new FeverTracker(CURRENT_FEVER);
  expect(f.status).toBe('ready');
  for (let i = 0; i < 46; i++) f.judgment(ev(i, i));
  expect(f.stage).toBe(2);
  expect(f.charge).toBe(0);
  expect(f.displayCombo).toBe(46);
  for (let i = 46; i < 184; i++) f.judgment(ev(i, i));
  expect(f.stage).toBe(5);
  expect(f.displayCombo).toBe(460);
  f.judgment(ev(184, 184, 90));
  expect(f.charge).toBe(0.9);
  expect(f.displayCombo).toBe(465);
  f.judgment(ev(185, 185, 0));
  expect(f.stage).toBe(1);
  expect(f.charge).toBe(0);
  expect(f.displayCombo).toBe(0);
  expect(
    new FeverTracker({ ...CURRENT_FEVER, rulesId: 'djmax-current-pending-v1' })
      .status,
  ).toBe('pending');
});
it('Orvio hold ticks are chart-clock events and tails do not charge twice', () => {
  const run = (times: number[]) => {
    const f = new FeverTracker(CURRENT_FEVER);
    f.judgment(ev(0, 0, 100, { holdEnd: 2 }));
    for (const t of times) f.advance(t);
    f.judgment(ev(1, 2, 100, { noteId: 0, tail: true }));
    return f;
  };
  const a = run([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]),
    b = run([2]);
  expect(a.journal).toEqual(b.journal);
  expect(a.charge).toBe(4.5);
  expect(a.displayCombo).toBe(9);
});
it('miss and hold ticks are interleaved by chart deadlines, not frame batch size', () => {
  const run = (times: number[]) => {
    const e = new Engine(
      [
        { id: 0, lane: 0, time: 0, end: 3 },
        { id: 1, lane: 1, time: 0.5 },
      ],
      CURRENT_FEVER,
    );
    e.input({ sequence: 0, lane: 0, time: 0, down: true });
    for (const t of times) e.update(t);
    e.input({ sequence: 1, lane: 0, time: 3, down: false });
    return e;
  };
  const fine = run([
      0.25, 0.5, 0.65001, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75,
    ]),
    coarse = run([2.75]);
  expect(coarse.fever.journal).toEqual(fine.fever.journal);
  expect(coarse.score).toBe(fine.score);
  expect(coarse.maxCombo).toBe(fine.maxCombo);
});
it('multiple misses and automatic hold tails use chronological fever deadlines while raw engine ordering stays legacy', () => {
  const notes = [
    { id: 0, lane: 0, time: 0, end: 2 },
    { id: 1, lane: 1, time: 0.5 },
    { id: 2, lane: 2, time: 1 },
    { id: 3, lane: 1, time: 2.5 },
  ];
  const run = (times: number[], on = true) => {
    const e = new Engine(notes, on ? CURRENT_FEVER : undefined);
    e.input({ sequence: 0, lane: 0, time: 0, down: true });
    times.forEach((t) => e.update(t));
    return e;
  };
  const fine = run([
      0.25, 0.5, 0.65001, 0.75, 1, 1.15001, 1.5, 2, 2.15001, 2.65001, 3,
    ]),
    coarse = run([3]),
    legacy = run([3], false);
  expect(coarse.fever.journal).toEqual(fine.fever.journal);
  expect(coarse.events).toEqual(legacy.events);
  expect(coarse.score).toBe(legacy.score);
  expect(coarse.maxCombo).toBe(legacy.maxCombo);
});
