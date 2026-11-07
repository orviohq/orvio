import { describe, expect, it } from 'vitest';
import { makeChart, SONGS } from '../src/chart';
import { countdownText, countdownTiming } from '../src/timing';

const DIFFS = ['low', 'mid', 'high'] as const;
const LANES = [5, 7] as const;
const SPEEDS = [1, 1.5, 9];

describe('A5 countdown lead-in', () => {
  it('stays positive and bounded for every builtin chart and speed', () => {
    for (const song of SONGS)
      for (const d of DIFFS)
        for (const lanes of LANES) {
          const notes = makeChart(song, d, lanes);
          expect(notes.length).toBeGreaterThan(0);
          const firstNote = Math.min(...notes.map((n) => n.time));
          const beat = 60 / song.bpm;
          for (const speed of SPEEDS) {
            const cd = countdownTiming(song.bpm, speed, firstNote);
            expect(cd.leadIn).toBeGreaterThanOrEqual(0.15);
            // builtin charts never reach the 0.15 floor, so the countdown
            // spans exactly 5 beats plus the 0.15s preroll, even when a fast
            // song at speed 1 pushes firstFall slightly negative
            expect(cd.firstFall).toBeGreaterThan(-0.5);
            expect(cd.leadIn + cd.firstFall).toBeCloseTo(5 * beat + 0.15, 9);
            expect(cd.firstFall).toBeLessThanOrEqual(firstNote);
            // the countdown clears exactly when the first note starts falling
            expect(countdownText(cd.firstFall, cd.firstFall, beat)).toBe('');
            expect(countdownText(cd.firstFall - 1e-9, cd.firstFall, beat)).toBe(
              '1',
            );
            // full 4-3-2-1 sequence inside the 4 beats before firstFall
            for (let k = 0; k < 4; k++)
              expect(
                countdownText(
                  cd.firstFall - (k + 0.5) * beat,
                  cd.firstFall,
                  beat,
                ),
              ).toBe(String(k + 1));
            expect(
              countdownText(cd.firstFall - 4 * beat - 1e-9, cd.firstFall, beat),
            ).toBe('READY');
          }
        }
  });

  it('never schedules the audio anchor in the past for late-first-note charts', () => {
    // 30s before the first note at 120 BPM (5 beats = 2.5s): naive formula goes negative
    const cd = countdownTiming(120, 1.5, 30);
    expect(cd.leadIn).toBe(0.15);
    expect(cd.firstFall).toBeCloseTo(30 - 2 / 1.5, 9);
  });

  it('handles a first note at time zero', () => {
    const cd = countdownTiming(110, 9, 0);
    // signed: the fall starts 2/speed before the note, inside the countdown
    expect(cd.firstFall).toBeCloseTo(-2 / 9, 9);
    expect(cd.leadIn).toBeCloseTo((5 * 60) / 110 + 2 / 9 + 0.15, 9);
    expect(countdownText(0, cd.firstFall, cd.beat)).toBe('');
    expect(countdownText(cd.firstFall - 1e-9, cd.firstFall, cd.beat)).toBe('1');
  });

  it('READY phase lasts one beat plus the preroll for builtin-style charts', () => {
    // first note on beat 4, 110 BPM, 1.5x: leadIn = 5*beat - firstFall + 0.15
    const bpm = 110;
    const beat = 60 / bpm;
    const cd = countdownTiming(bpm, 1.5, 4 * beat);
    expect(cd.firstFall).toBeCloseTo(4 * beat - 2 / 1.5, 9);
    expect(cd.leadIn).toBeCloseTo(5 * beat - cd.firstFall + 0.15, 9);
    // READY from chart-time -leadIn until firstFall - 4*beat => beat + 0.15 seconds
    const readyDuration = cd.firstFall - 4 * beat - -cd.leadIn;
    expect(readyDuration).toBeCloseTo(beat + 0.15, 9);
  });
});
