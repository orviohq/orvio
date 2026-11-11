import { it, expect } from 'vitest';
import {
  REPLAY_COUNT_KEY,
  readReplayCount,
  replayMenuVisible,
  writeReplayCount,
} from '../src/replay-menu-count';
function fakeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
it('a missing key reads as zero', () => {
  expect(readReplayCount(fakeStorage())).toBe(0);
});
it('garbage JSON reads as zero', () => {
  expect(readReplayCount(fakeStorage({ [REPLAY_COUNT_KEY]: '{bad' }))).toBe(0);
});
it('an unsupported version reads as zero', () => {
  expect(
    readReplayCount(fakeStorage({ [REPLAY_COUNT_KEY]: '{"v":2,"n":3}' })),
  ).toBe(0);
});
it('a negative count reads as zero', () => {
  expect(
    readReplayCount(fakeStorage({ [REPLAY_COUNT_KEY]: '{"v":1,"n":-1}' })),
  ).toBe(0);
});
it('a fractional count reads as zero', () => {
  expect(
    readReplayCount(fakeStorage({ [REPLAY_COUNT_KEY]: '{"v":1,"n":1.5}' })),
  ).toBe(0);
});
it('a written count reads back', () => {
  const storage = fakeStorage();
  writeReplayCount(3, storage);
  expect(readReplayCount(storage)).toBe(3);
});
it('writing zero removes the key', () => {
  const storage = fakeStorage();
  writeReplayCount(3, storage);
  writeReplayCount(0, storage);
  expect(storage.values.has(REPLAY_COUNT_KEY)).toBe(false);
  expect(readReplayCount(storage)).toBe(0);
});
it('writing a negative count also removes the key', () => {
  const storage = fakeStorage();
  writeReplayCount(3, storage);
  writeReplayCount(-2, storage);
  expect(storage.values.has(REPLAY_COUNT_KEY)).toBe(false);
  expect(readReplayCount(storage)).toBe(0);
});
it('the replay menu is visible only for a positive count', () => {
  expect(replayMenuVisible(0)).toBe(false);
  expect(replayMenuVisible(1)).toBe(true);
});
