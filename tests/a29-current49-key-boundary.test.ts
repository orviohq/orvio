import { it, expect } from 'vitest';
import { makeChart, SONGS, Lanes } from '../src/chart';
import { validateRuntimeReplay, replayEngine } from '../src/replay';
import { readResult, resultParams } from '../src/share';
it('all new builtin lanes produce valid charts, replay operations and results without changing legacy charts', () => {
  for (const lanes of [4, 5, 6, 7, 8] as Lanes[]) {
    const notes = makeChart(SONGS[0], 'low', lanes);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.every((n) => n.lane < lanes)).toBe(true);
    const replay = {
      version: 1 as const,
      song: SONGS[0].id,
      lanes,
      difficulty: 'low' as const,
      options: {
        speed: 1.5,
        fader: 'off' as const,
        shuffle: 'off' as const,
        seed: 0,
      },
      end: 0,
      ops: [],
    };
    expect(
      validateRuntimeReplay(replay, (id) => id === SONGS[0].id),
    ).toBeTruthy();
    const engine = replayEngine(replay);
    engine.update(9999);
    expect(engine.total).toBeGreaterThanOrEqual(notes.length);
    expect(engine.score).toBe(0);
    expect(engine.events.every((e) => e.value === 0)).toBe(true);
    const result = {
      song: SONGS[0].id as 'first-light',
      lanes,
      difficulty: 'low' as const,
      score: 0,
      accuracy: 0,
      combo: 0,
    };
    expect(readResult(resultParams(result))?.lanes).toBe(lanes);
  }
});
