import { test, expect } from 'vitest';
import { VisualClock } from '../src/visual-clock';
test('display-only phase tracking bounds jitter while keeping one-to-one real-time speed', () => {
  const c = new VisualClock();
  let previous = 0;
  const deltas = [];
  for (let i = 0; i < 600; i++) {
    const actual = i / 60 + (i % 2 ? 0.004 : -0.004);
    const t = c.sample((i * 1000) / 60, actual);
    if (i > 60) deltas.push(t - previous);
    previous = t;
  }
  expect(Math.max(...deltas) - Math.min(...deltas)).toBeLessThan(0.002);
  expect(previous).toBeCloseTo(599 / 60, 2);
});
test('pause, resume, reset and seek do not extrapolate old motion', () => {
  const c = new VisualClock();
  expect(c.sample(100, 1)).toBe(1);
  expect(c.sample(2000, 1)).toBe(1);
  expect(c.sample(2016, 4)).toBe(4);
  c.reset();
  expect(c.sample(2032, 0)).toBe(0);
});
