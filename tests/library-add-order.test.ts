import { it, expect } from 'vitest';
import { LibraryAddOrder } from '../src/library-add-order';
it('explicit new adds are newest first, duplicates/retries do not promote, reload is stable and legacy keeps relative order', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
  const order = new LibraryAddOrder(storage);
  order.added('AAAAAAAAAAA');
  order.added('BBBBBBBBBBB');
  order.added('AAAAAAAAAAA');
  expect(order.rank('BBBBBBBBBBB')).toBeLessThan(order.rank('AAAAAAAAAAA'));
  expect(order.rank('AAAAAAAAAAA')).toBeLessThan(order.rank('CCCCCCCCCCC'));
  expect(order.rank('CCCCCCCCCCC')).toBeLessThan(order.rank(undefined));
  const restored = new LibraryAddOrder(storage);
  expect(restored.rank('BBBBBBBBBBB')).toBe(0);
  expect(restored.rank('AAAAAAAAAAA')).toBe(1);
});
it('invalid or blocked optional order state does not change playback data or block this visit order', () => {
  const order = new LibraryAddOrder({
    getItem: () => '{',
    setItem: () => {
      throw Error('blocked');
    },
  });
  order.added('bad');
  order.added('AAAAAAAAAAA');
  expect(order.rank('bad')).toBe(Number.MAX_SAFE_INTEGER - 1);
  expect(order.rank('AAAAAAAAAAA')).toBe(0);
});
