import { it, expect } from 'vitest';
import { builtinShareFragment } from '../src/builtin-share-fragment';
import { makeChart, SONGS } from '../src/chart';
import {
  replayEngine,
  decodeReplay,
  replayMatches,
  type RuntimeReplay,
} from '../src/replay';
import { readResult, type SharedResult } from '../src/share';
it('fresh and local builtin archive produce valid nonempty public replay; changed snapshot refuses', async () => {
  const replay: RuntimeReplay = {
    version: 1,
    song: SONGS[0].id,
    lanes: 5,
    difficulty: 'low',
    options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 1 },
    ops: [],
    end: 100,
  };
  const e = replayEngine(replay);
  e.update(9999);
  const result: SharedResult = {
    song: 'first-light',
    lanes: 5,
    difficulty: 'low',
    score: e.score,
    accuracy: e.sum / e.total,
    combo: e.maxCombo,
    options: replay.options,
    judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
      (v) => e.events.filter((e) => e.value === v).length,
    ),
  };
  for (const notes of [undefined, makeChart(SONGS[0], 'low', 5)]) {
    const fragment = await builtinShareFragment(replay, result, notes);
    expect(fragment.length).toBeGreaterThan(100);
    const p = new URLSearchParams(fragment);
    expect(readResult(p)).toEqual(result);
    const r = await decodeReplay(p.get('r')!);
    expect(r).not.toBeNull();
    expect(replayMatches(r!, result)).toBe(true);
  }
  const changed = structuredClone(makeChart(SONGS[0], 'low', 5));
  changed[0].time += 0.1;
  await expect(builtinShareFragment(replay, result, changed)).rejects.toThrow();
});
