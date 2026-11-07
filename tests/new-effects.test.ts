import { test, expect } from 'vitest';
import { blinkAlpha, fadeAlpha, FADERS } from '../src/game-options';
import { readResult, resultParams } from '../src/share';
import { validateReplay } from '../src/replay';
test('beat-locked blink and blind are display only, all eleven options survive result/replay validation', () => {
  expect(blinkAlpha(0, 120)).toBe(1);
  expect(blinkAlpha(0.3, 120)).toBe(0);
  expect(blinkAlpha(0.5, 120)).toBe(1);
  expect(fadeAlpha('blind', 0.7)).toBe(0);
  for (const fader of ['blink', 'blink2', 'fog'] as const)
    expect(fadeAlpha(fader, 0.7)).toBe(1);
  for (const fader of FADERS) {
    const options = { speed: 1.5, fader, shuffle: 'off' as const, seed: 0 };
    const r = {
      song: 'first-light' as const,
      lanes: 5 as const,
      difficulty: 'low' as const,
      score: 500000,
      accuracy: 50,
      combo: 1,
      judgments: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      options,
    };
    expect(readResult(resultParams(r))?.options?.fader).toBe(fader);
    expect(
      validateReplay({
        version: 1,
        song: r.song,
        lanes: 5,
        difficulty: 'low',
        options,
        ops: [[3, 0, 0, 1.5, fader]],
        end: 1,
      }),
    ).not.toBeNull();
  }
});
