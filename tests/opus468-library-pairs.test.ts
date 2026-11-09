import { it, expect } from 'vitest';
import { createOpus468LibraryPairs } from '../src/opus/opus468-library-pairs';
it('exact base/extension identity routing in both directions never rewrites stored ids', () => {
  const p = createOpus468LibraryPairs();
  p.attach('base', 'ext');
  for (const n of [4, 6, 8]) {
    expect(p.resolve('base', n)).toBe('ext');
    expect(p.resolve('ext', n)).toBe('ext');
  }
  for (const n of [5, 7]) {
    expect(p.resolve('base', n)).toBe('base');
    expect(p.resolve('ext', n)).toBe('base');
  }
  expect(p.resolve('builtin', 4)).toBe('builtin');
  expect(() => p.attach('base', 'different')).toThrow(
    'extension_pair_conflict',
  );
  expect(() => p.attach('other', 'ext')).toThrow('extension_pair_conflict');
});
