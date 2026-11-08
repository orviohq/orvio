import { expect, it } from 'vitest';
import { scrollPixels, visibleTravel } from '../src/note-scroll';
import { startupCountdownTiming, countdownText } from '../src/timing';
import { noteLayout } from '../src/note-layout';
import { Engine } from '../src/engine';
it('same speed has identical CSS-pixel movement at every field height', () => {
  for (const speed of [1, 1.5, 4.5, 9]) {
    const px = scrollPixels(2 / speed);
    expect(px).toBe(528 / (2 / speed));
    const movements = [308, 528, 808].map((target) => {
      const e = new Engine([{ id: 0, lane: 0, time: 10 }]);
      return (
        noteLayout(e.states[0], target, 9.9, px, target + 92).headY -
        noteLayout(e.states[0], target, 9.8, px, target + 92).headY
      );
    });
    for (const movement of movements) expect(movement).toBeCloseTo(px * 0.1, 9);
  }
});
it('reserves earliest visible entry at 1x including margin for every viewport and live speed', () => {
  for (const height of [240, 400, 620, 900, 1440, 2160])
    for (const first of [0, 0.1, 2, 20]) {
      const cd = startupCountdownTiming(120, first, visibleTravel(height));
      expect(countdownText(cd.firstFall, cd.firstFall, cd.beat)).toBe('');
      expect(cd.leadIn + cd.firstFall).toBeGreaterThan(4 * cd.beat);
      for (const speed of [1, 1.5, 4.5, 9]) {
        const earliest = first - visibleTravel(height, speed);
        expect(earliest).toBeGreaterThanOrEqual(cd.firstFall - 1e-10);
        expect(countdownText(earliest, cd.firstFall, cd.beat)).toBe('');
      }
    }
});
it('growing a viewport only clears countdown earlier and never changes chart times', () => {
  const first = 2;
  const initial = startupCountdownTiming(120, first, visibleTravel(400));
  const resized = Math.min(initial.firstFall, first - visibleTravel(1200));
  expect(resized).toBeLessThan(initial.firstFall);
  expect(
    countdownText(first - visibleTravel(1200), resized, initial.beat),
  ).toBe('');
  expect(first).toBe(2);
});
