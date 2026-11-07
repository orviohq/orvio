import { describe, it, expect } from 'vitest';
import { countdownText, startupCountdownTiming } from '../src/timing';
describe('countdown stays safe across every supported live speed', () => {
  it('uses a fixed earliest fall without moving notes or gating the renderer', () => {
    for (const bpm of [60, 80, 110, 128, 150, 240])
      for (const first of [0, 0.05, 0.487619, (4 * 60) / bpm, 12.4876, 30]) {
        const timing = startupCountdownTiming(bpm, first);
        expect(timing.firstFall).toBe(first - 2);
        for (let speed = 10; speed <= 90; speed++) {
          const naturalFall = first - 2 / (speed / 10);
          expect(naturalFall).toBeGreaterThanOrEqual(timing.firstFall);
          expect(
            countdownText(naturalFall, timing.firstFall, timing.beat),
          ).toBe('');
        }
        for (let n = 0; n < 4; n++)
          expect(
            countdownText(
              timing.firstFall - (3.5 - n) * timing.beat,
              timing.firstFall,
              timing.beat,
            ),
          ).toBe(String(4 - n));
      }
  });
});
