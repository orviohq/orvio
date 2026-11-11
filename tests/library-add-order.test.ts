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

it('appends missing pending ranks behind known IDs in restored Map order, once', () => {
  const values = new Map<string, string>();
  const writes: string[] = [];
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key);
      values.set(key, value);
    },
  };
  const order = new LibraryAddOrder(storage);
  order.added('KKKKKKKKKKK');
  const pending = new Map([
    ['BBBBBBBBBBB', 'loading'],
    ['AAAAAAAAAAA', 'error'],
    ['CCCCCCCCCCC', 'loading'],
  ]);
  order.ensurePendingOrder(pending.keys());
  const sorted = () => [...pending.keys()].sort((a, b) => order.rank(a) - order.rank(b));
  expect(sorted()).toEqual(['BBBBBBBBBBB', 'AAAAAAAAAAA', 'CCCCCCCCCCC']);
  expect(order.rank('KKKKKKKKKKK')).toBe(0);
  expect(order.rank('BBBBBBBBBBB')).toBe(1);
  pending.set('AAAAAAAAAAA', 'loading');
  const saved = [...values];
  order.added('AAAAAAAAAAA');
  order.ensurePendingOrder(pending.keys());
  expect([...values]).toEqual(saved);
  expect(writes).toEqual(['orvio.library-add-order.v1', 'orvio.library-add-order.v1']);
  expect(sorted()).toEqual(['BBBBBBBBBBB', 'AAAAAAAAAAA', 'CCCCCCCCCCC']);
  const reload = new LibraryAddOrder(storage);
  for (const id of ['KKKKKKKKKKK', ...pending.keys()])
    expect(reload.rank(id)).toBe(order.rank(id));
  order.added('DDDDDDDDDDD');
  expect(order.rank('DDDDDDDDDDD')).toBe(0);
  expect(order.rank('KKKKKKKKKKK')).toBe(1);
});

it('mixed known pending IDs retain existing ranks; invalid and repeated IDs are ignored', () => {
  const writes: string[] = [];
  const order = new LibraryAddOrder({
    getItem: () => '["KKKKKKKKKKK","AAAAAAAAAAA"]',
    setItem: (_key, value) => { writes.push(value); },
  });
  order.ensurePendingOrder([
    'BBBBBBBBBBB', 'AAAAAAAAAAA', 'bad', '', 'BBBBBBBBBBB',
    'KKKKKKKKKKK', 'CCCCCCCCCCC', 'https://youtu.be/DDDDDDDDDDD',
  ]);
  expect(writes).toEqual(['["KKKKKKKKKKK","AAAAAAAAAAA","BBBBBBBBBBB","CCCCCCCCCCC"]']);
  order.ensurePendingOrder(['bad', 'AAAAAAAAAAA', 'CCCCCCCCCCC']);
  expect(writes).toHaveLength(1);
  expect(order.rank('AAAAAAAAAAA')).toBe(1);
  expect(order.rank('BBBBBBBBBBB')).toBe(2);
});

it('blocked persistence retains fallback ranks in memory and never promotes a retry', () => {
  let writes = 0;
  const order = new LibraryAddOrder({
    getItem: () => '["KKKKKKKKKKK"]',
    setItem: () => { writes++; throw Error('blocked'); },
  });
  expect(() => order.ensurePendingOrder(['BBBBBBBBBBB', 'AAAAAAAAAAA', 'CCCCCCCCCCC'])).not.toThrow();
  order.added('AAAAAAAAAAA');
  order.ensurePendingOrder(['BBBBBBBBBBB', 'AAAAAAAAAAA', 'CCCCCCCCCCC']);
  expect(writes).toBe(1);
  expect(['KKKKKKKKKKK', 'BBBBBBBBBBB', 'AAAAAAAAAAA', 'CCCCCCCCCCC'].map(id => order.rank(id))).toEqual([0, 1, 2, 3]);
});
