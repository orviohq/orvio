import { test, expect } from 'vitest';
import { motionExposure } from '../src/motion-exposure';
test('continuous display footprint only at high displacement, no hold/pause trail or catchup streak', () => {
  expect(motionExposure(200, 16.67, false)).toBe(0);
  expect(motionExposure(2400, 1000 / 60, false)).toBeCloseTo(30);
  expect(motionExposure(2400, 1000 / 120, false)).toBeCloseTo(10);
  expect(motionExposure(2400, 16.67, true)).toBe(0);
  expect(motionExposure(2400, 150, false)).toBe(0);
  expect(motionExposure(2400, 0, false)).toBe(0);
  expect(motionExposure(10000, 16.67, false)).toBe(48);
});
