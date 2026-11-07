import { it, expect } from 'vitest';
import { laneOrder, transformChart, fadeAlpha } from '../src/game-options';
import { SONGS, makeChart } from '../src/chart';
it('off and mirror have exact lane mappings', () => {
  expect(laneOrder(5, 'off', 1)).toEqual([0, 1, 2, 3, 4]);
  expect(laneOrder(7, 'mirror', 1)).toEqual([6, 5, 4, 3, 2, 1, 0]);
});
it('random is deterministic, bijective, deranged, not mirror and keeps valid holds/chords', () => {
  for (const lanes of [5, 7] as const)
    for (let seed = 0; seed < 100; seed++) {
      const order = laneOrder(lanes, 'random', seed);
      expect(new Set(order).size).toBe(lanes);
      expect(order.every((v, i) => v !== i)).toBe(true);
      expect(order.some((v, i) => v !== lanes - 1 - i)).toBe(true);
      expect(laneOrder(lanes, 'random', seed)).toEqual(order);
      const notes = makeChart(SONGS[0], 'high', lanes),
        changed = transformChart(notes, lanes, 'random', seed);
      changed.forEach((n, i) => {
        expect(n.time).toBe(notes[i].time);
        expect(n.end).toBe(notes[i].end);
        expect(n.lane).toBe(order[notes[i].lane]);
      });
    }
});
it('fades have correct direction and second variants use later reveal or earlier hiding', () => {
  expect(fadeAlpha('off', 0.4)).toBe(1);
  expect(fadeAlpha('in', 0)).toBe(0);
  expect(fadeAlpha('in', 1)).toBe(1);
  expect(fadeAlpha('out', 0)).toBe(1);
  expect(fadeAlpha('out', 1)).toBe(0);
  expect(fadeAlpha('in2', 0.6)).toBe(0);
  expect(fadeAlpha('in', 0.6)).toBe(1);
  expect(fadeAlpha('out2', 0.6)).toBe(0);
  expect(fadeAlpha('out', 0.6)).toBe(1);
});
