import { it, expect } from 'vitest';
import {
  readLibrarySelection,
  writeLibrarySelection,
  resolveLibrarySelection,
} from '../src/library-selection';
it('restores stable identities not indices and never resurrects unavailable entries', () => {
  expect(resolveLibrarySelection(['second', 'first'], 'first')).toBe(1);
  expect(resolveLibrarySelection(['second'], 'first')).toBe(-1);
  expect(resolveLibrarySelection(['yt:AAAAAAAAAAA'], 'yt:AAAAAAAAAAA')).toBe(0);
});
it('selection storage is optional and bounded', () => {
  const state = { key: 'yt:AAAAAAAAAAA', scroll: 120, pageScroll: 0 };
  const store = {
    getItem: () => JSON.stringify(state),
    setItem: () => {
      throw Error('denied');
    },
  };
  expect(readLibrarySelection(store)).toEqual(state);
  expect(() => writeLibrarySelection(store, state)).not.toThrow();
  for (const raw of [
    'broken',
    'null',
    '{"key":"a","scroll":-1,"pageScroll":0}',
  ])
    expect(readLibrarySelection({ getItem: () => raw })).toBeNull();
});
