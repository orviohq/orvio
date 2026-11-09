import { it, expect } from 'vitest';
import { createOpus468LibraryPairs } from '../src/opus/opus468-library-pairs';
it('new default selection and exact old replay identity coexist without rewriting either', () => {
  const p = createOpus468LibraryPairs();
  p.attach('base', 'old');
  p.attach('base', 'new', 'unified');
  for (const n of [4, 6, 8]) {
    expect(p.resolve('base', n)).toBe('new');
    expect(p.resolve('old', n)).toBe('old');
    expect(p.resolve('new', n)).toBe('new');
  }
  for (const n of [5, 7]) {
    expect(p.resolve('old', n)).toBe('base');
    expect(p.resolve('new', n)).toBe('base');
  }
  expect(p.extension('old')).toBe('new');
  expect(p.base('old')).toBe('base');
  p.attach('base', 'old');
  expect(p.extension('base')).toBe('new');
  expect(() => p.attach('base', 'other', 'unified')).toThrow(
    'extension_pair_conflict',
  );
  expect(() => p.attach('different', 'old')).toThrow('extension_pair_conflict');
  expect(() => p.attach('base', 'old', 'unified')).toThrow(
    'extension_pair_conflict',
  );
});
it('legacy same-generation conflicts remain errors', () => {
  const p = createOpus468LibraryPairs();
  p.attach('base', 'old');
  expect(() => p.attach('base', 'other')).toThrow('extension_pair_conflict');
  expect(p.resolve('builtin', 4)).toBe('builtin');
});
it('arrival order cannot downgrade the preferred generation', () => {
  const p = createOpus468LibraryPairs();
  p.attach('base', 'new', 'unified');
  p.attach('base', 'old');
  expect(p.resolve('base', 4)).toBe('new');
  expect(p.resolve('old', 4)).toBe('old');
});
it('preferred new does not hide two conflicting legacy identities', () => {
  const p = createOpus468LibraryPairs();
  p.attach('base', 'new', 'unified');
  p.attach('base', 'oldA');
  expect(() => p.attach('base', 'oldB')).toThrow('extension_pair_conflict');
});
