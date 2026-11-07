import { describe, expect, it } from 'vitest';
import { SONGS, makeChart } from '../src/chart';
import { countdownTiming, countdownText } from '../src/timing';

// A5 invariant: for every built-in song/lane/difficulty and every speed the
// selector offers (1..9 in 0.5 steps), the patched countdown/lead-in keeps
// the audio anchor >= 0.15s in the future, keeps a visible READY phase, and
// never lets the first note fall before the countdown clears.
describe('A5 leadIn bounds (real selector range)', () => {
  const speeds = Array.from({ length: 17 }, (_, i) => 1 + i / 2);
  it('306 combos all satisfy the invariants', () => {
    let combos = 0;
    for (const song of SONGS) {
      for (const lanes of [5, 7] as const) {
        for (const diff of ['low', 'mid', 'high'] as const) {
          const first = makeChart(song, diff, lanes)[0]?.time;
          for (const speed of speeds) {
            combos++;
            const { leadIn, firstFall, beat } = countdownTiming(
              song.bpm,
              speed,
              first ?? (4 * 60) / song.bpm,
            );
            expect(leadIn).toBeGreaterThanOrEqual(0.15);
            // fast songs at speed 1 legitimately go negative (firstFall > -0.4)
            expect(firstFall).toBeGreaterThan(-0.5);
            expect(leadIn).toBeGreaterThan(4 * beat - firstFall); // READY visible
            // countdown clears exactly when the first fall starts
            expect(countdownText(firstFall, firstFall, beat)).toBe('');
            expect(countdownText(firstFall - 1e-9, firstFall, beat)).toBe('1');
          }
        }
      }
    }
    expect(combos).toBe(306); // 3 songs x 2 lane modes x 3 difficulties x 17 speeds
  });
});

describe('A5 external early first note (negative firstFall)', () => {
  it('keeps the first fall at countdown clear instead of clamping to 0', () => {
    // frontend live fixture (a5-inline-early-repro.json): "Early note fixture"
    // YouTube import, 170 BPM, first note 0.4876190476s, speed 1.5
    const { leadIn, firstFall, beat } = countdownTiming(
      170,
      1.5,
      0.4876190476190476,
    );
    expect(firstFall).toBeCloseTo(-0.8457142857, 9); // NOT clamped to 0
    expect(beat).toBeCloseTo(0.3529411765, 9);
    expect(leadIn).toBeCloseTo(2.7604201681, 9);
    expect(leadIn).toBeGreaterThanOrEqual(0.15);
    // countdown numbers span the 4 beats before firstFall and clear at it
    expect(countdownText(firstFall - 4 * beat - 1e-9, firstFall, beat)).toBe(
      'READY',
    );
    expect(countdownText(firstFall - 1e-9, firstFall, beat)).toBe('1');
    expect(countdownText(firstFall, firstFall, beat)).toBe('');
    // frontend observed countdown "2" with the note falling at chart -0.5687;
    // with the fix the countdown is already cleared then (time > firstFall)
    expect(countdownText(-0.5687175354, firstFall, beat)).toBe('');
    // READY phase is visible from the start (time = -leadIn)
    expect(-leadIn).toBeLessThan(firstFall - 4 * beat);
  });
  it('negative firstFall keeps countdown length at 5 beats + 0.15s', () => {
    const beat = 60 / 128;
    const { leadIn, firstFall } = countdownTiming(128, 9, 0.05);
    expect(firstFall).toBeLessThan(0);
    expect(leadIn + firstFall).toBeCloseTo(5 * beat + 0.15, 9);
  });
});
