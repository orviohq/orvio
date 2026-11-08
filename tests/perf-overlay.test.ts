import { it, expect } from 'vitest';
import { formatPerf, percentile } from '../src/perf-overlay';

const steady = (n: number, v: number) => Array.from({ length: n }, () => v);

it('percentile picks the sorted index honestly', () => {
  expect(percentile([], 0.5)).toBe(0);
  expect(percentile([10], 0.95)).toBe(10);
  expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)).toBe(6);
});

it('reports a collecting state below 30 frames instead of fake stats', () => {
  expect(
    formatPerf({ intervals: steady(12, 16.7), works: [], visible: 0 }),
  ).toBe('perf: collecting 12/30 frames');
});

it('steady frames show zero spikes and real values', () => {
  const out = formatPerf({
    intervals: steady(120, 16.7),
    works: steady(120, 1.5),
    visible: 8,
  });
  expect(out).toContain('p50 16.7');
  expect(out).toContain('p95 16.7');
  expect(out).toContain('max 16.7');
  expect(out).toContain('>2x 0');
  expect(out).toContain('cpu p95 1.5');
  expect(out).toContain('vis 8');
  expect(out).toContain('last 120f');
});

it('spikes are relative to the window median, never a fixed refresh rate', () => {
  // 90Hz-like cadence (~11.1ms) with one 33ms stall: flagged relative to its
  // own median, so no 60Hz assumption is baked in.
  const intervals = [...steady(119, 11.1), 33.3];
  const out = formatPerf({ intervals, works: steady(120, 2), visible: 3 });
  expect(out).toContain('>2x 1');
  expect(out).toContain('max 33.3');
  expect(out).toContain('p50 11.1');
});
