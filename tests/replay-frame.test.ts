import { it, expect } from 'vitest';
import { replayFrameChanged } from '../src/replay-frame';
import { Engine } from '../src/engine';
import { CURRENT_FEVER } from '../src/fever';
it('records holdtick-only updates deterministically, then replays each quartertick without another input or judgment', () => {
  const notes = [{ id: 0, time: 1, lane: 0, end: 3 }];
  const live = new Engine(notes, CURRENT_FEVER),
    replay = new Engine(notes, CURRENT_FEVER);
  for (const e of [live, replay])
    e.input({ sequence: 0, lane: 0, time: 1, down: true });
  const ops: number[] = [];
  for (const time of [1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75]) {
    const before = live.events.length,
      feverBefore = live.fever.journal.length;
    live.update(time);
    expect(live.events.length).toBe(before);
    expect(
      replayFrameChanged(
        before,
        live.events.length,
        feverBefore,
        live.fever.journal.length,
      ),
    ).toBe(true);
    ops.push(time);
    replay.update(time);
    expect(replay.fever.journal).toEqual(live.fever.journal);
    expect(replay.fever.displayCombo).toBe(live.fever.displayCombo);
  }
  expect(ops).toEqual([1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75]);
  expect(replayFrameChanged(1, 1, 8, 8)).toBe(false);
  expect(replayFrameChanged(1, 2, 8, 8)).toBe(true);
});
it('input-advanced ticks travel in op0, frame-only ticks in op1, and every applied op reconstructs exact intermediate state', () => {
  const notes = [
    { id: 0, time: 1, lane: 0, end: 3 },
    { id: 1, time: 1.5, lane: 1 },
  ];
  const live = new Engine(notes, CURRENT_FEVER),
    replay = new Engine(notes, CURRENT_FEVER);
  let seq = 0;
  let last = 0;
  const input = (time: number, lane: number, down: boolean) => {
    const op = { sequence: seq++, time, lane, down };
    live.input(op);
    replay.input(op);
    expect(replay.fever.journal).toEqual(live.fever.journal);
    last = time;
  };
  input(1, 0, true); // opens held note
  input(1.5, 1, true); // op0 itself generates two hold ticks, no op1 is required
  expect(live.fever.journal.filter((x) => x.kind === 'hold-tick')).toHaveLength(
    2,
  );
  for (const time of [1.6, 1.9, 2.1, 2.6]) {
    const n = live.events.length,
      f = live.fever.journal.length;
    live.update(time);
    if (
      replayFrameChanged(n, live.events.length, f, live.fever.journal.length)
    ) {
      replay.update(time);
      last = time;
      expect(replay.fever.journal).toEqual(live.fever.journal);
    }
  }
  input(3, 0, false);
  expect(replay.events).toEqual(live.events);
  expect(replay.score).toBe(live.score);
  expect(last).toBe(3);
});
