import { it, expect } from 'vitest';
import {
  hiddenLibraryIds,
  saveHiddenLibraryIds,
  removalLabels,
} from '../src/library-removal';
import { LANGUAGES } from '../src/i18n';
const id = 'yt-I_DocC3srzY-1f7116af22c84f4a-c0b7f43d7af4b9c07';
it('persists exact external version IDs, rejecting builtins and malformed storage', () => {
  let value = '[]';
  const storage = {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
  saveHiddenLibraryIds(new Set([id]), storage);
  expect([...hiddenLibraryIds(storage)]).toEqual([id]);
  value = JSON.stringify([id, 'first-light', 'not-a-source', 42]);
  expect([...hiddenLibraryIds(storage)]).toEqual([id]);
  value = '{';
  expect(hiddenLibraryIds(storage).size).toBe(0);
});
it('does not pretend persistence succeeded after a failed write/readback', () => {
  expect(() =>
    saveHiddenLibraryIds(new Set([id]), {
      setItem: () => {
        throw Error('quota');
      },
      getItem: () => null,
    }),
  ).toThrow();
  expect(() =>
    saveHiddenLibraryIds(new Set([id]), {
      setItem: () => {},
      getItem: () => null,
    }),
  ).toThrow();
});
it('all locales explain the version-only scope and recovery', () => {
  for (const l of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    const copy = removalLabels(l);
    expect(copy.prompt.length).toBeGreaterThan(30);
    expect(copy.confirm).not.toBe(copy.cancel);
    expect(copy.removed).not.toBe(copy.failed);
  }
});
