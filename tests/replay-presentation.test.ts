import { it, expect } from 'vitest';
import {
  recordedTime,
  archiveDuration,
  archiveTime,
  archiveLabels,
} from '../src/replay-presentation';
it('never invents legacy play dates and handles malformed optional presentation fields', () => {
  for (const x of [
    undefined,
    null,
    '2026',
    -1,
    NaN,
    Infinity,
    0,
    1.5,
    8640000000000001,
  ])
    expect(recordedTime(x)).toBeNull();
  expect(recordedTime(1794146400000)).toBe(1794146400000);
  expect(archiveDuration(173.9)).toBe('2:53');
  for (const x of [null, -1, NaN, Infinity])
    expect(archiveDuration(x)).toBe('--:--');
  for (const language of Object.keys(
    archiveLabels,
  ) as (keyof typeof archiveLabels)[])
    expect(archiveTime(1794146400000, language)).toBeTruthy();
});
