// Focused evidence specs for the song-share no-trace fix (failures 94-99).
// Not part of the product suite; bounded to the two FE review gaps.
import { test, expect } from '@playwright/test';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { queryKeys, QUERY_CACHE_SCHEMA } from '../src/query-client';

const DATABASE = 'orvio.query-cache.v1';
const STORE = 'client';
const STORAGE_KEY = 'orvio-query-client';

async function makeSnapshot(
  queryKey: readonly unknown[],
  buster: string,
): Promise<string> {
  const client = new QueryClient();
  await client.fetchQuery({
    queryKey,
    queryFn: async () => ({ title: 'seed' }),
    retry: false,
  });
  return JSON.stringify({
    buster,
    timestamp: Date.now(),
    clientState: dehydrate(client),
  });
}

async function readStored(page: import('@playwright/test').Page) {
  return page.evaluate(
    async ({ DATABASE, STORE, STORAGE_KEY }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open(DATABASE, 1);
        r.onupgradeneeded = () => r.transaction?.abort(); // probe: never create
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      try {
        return await new Promise<string | null>((resolve, reject) => {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(STORAGE_KEY);
          req.onsuccess = () => resolve(req.result ?? null);
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { DATABASE, STORE, STORAGE_KEY },
  );
}

test('cold visit without IDBFactory.databases() leaves zero databases', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__dbs = IDBFactory.prototype.databases;
    delete (IDBFactory.prototype as any).databases;
  });
  await page.goto('/song/#v=5&d=private-replay');
  await expect(page.locator('#song-add')).toBeDisabled();
  const names = await page.evaluate(async () => {
    IDBFactory.prototype.databases = (window as any).__dbs;
    return (await indexedDB.databases()).map((x) => x.name);
  });
  expect(names).toEqual([]);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({});
});

test('prior snapshot with only ineligible queries converges to empty, no resurrection on reload', async ({
  page,
}) => {
  const seed = await makeSnapshot(
    queryKeys.canonicalSource('AAAAAAAAAAA'),
    QUERY_CACHE_SCHEMA,
  );
  await page.goto('/song/#v=5&d=private-replay'); // cold: no DB yet
  await page.evaluate(
    async ({ DATABASE, STORE, STORAGE_KEY, seed }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open(DATABASE, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(seed, STORAGE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { DATABASE, STORE, STORAGE_KEY, seed },
  );
  await page.reload(); // restore hydrates, then save clears
  await expect(page.locator('#song-add')).toBeDisabled();
  await expect
    .poll(
      async () =>
        JSON.parse((await readStored(page)) ?? '{}').clientState?.queries,
    )
    .toEqual([]);
  await page.reload(); // nothing resurrects
  await expect(page.locator('#song-add')).toBeDisabled();
  expect(
    JSON.parse((await readStored(page)) ?? '{}').clientState?.queries,
  ).toEqual([]);
});

test('legacy v1 snapshot: ambiguous canonical-metadata dropped, not resurrected', async ({
  page,
}) => {
  const seed = await makeSnapshot(
    queryKeys.canonicalMetadata('AAAAAAAAAAA', 'ab'.repeat(32)),
    'orvio-query-v1',
  );
  await page.goto('/song/#v=5&d=private-replay');
  await page.evaluate(
    async ({ DATABASE, STORE, STORAGE_KEY, seed }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open(DATABASE, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(seed, STORAGE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { DATABASE, STORE, STORAGE_KEY, seed },
  );
  await page.reload();
  await expect(page.locator('#song-add')).toBeDisabled();
  // The busted snapshot is discarded by restore; the convergence save may
  // re-write an EMPTY v2 snapshot. Either way no old data survives.
  await expect
    .poll(async () => {
      const raw = await readStored(page);
      if (raw == null) return 'cleared';
      const parsed = JSON.parse(raw);
      return parsed.buster === 'orvio-query-v2' &&
        parsed.clientState.queries.length === 0
        ? 'cleared'
        : 'stale';
    })
    .toBe('cleared');
});

test('legacy v1 snapshot: shared-replay warm entry survives migration', async ({
  page,
}) => {
  const seed = await makeSnapshot(
    queryKeys.sharedReplay('seedreplay01'),
    'orvio-query-v1',
  );
  await page.goto('/song/#v=5&d=private-replay');
  await page.evaluate(
    async ({ DATABASE, STORE, STORAGE_KEY, seed }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open(DATABASE, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(seed, STORAGE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { DATABASE, STORE, STORAGE_KEY, seed },
  );
  await page.reload();
  await expect(page.locator('#song-add')).toBeDisabled();
  await expect
    .poll(async () => {
      const raw = await readStored(page);
      if (raw == null) return null;
      const parsed = JSON.parse(raw);
      return {
        buster: parsed.buster,
        groups: parsed.clientState.queries.map(
          (q: { queryKey: unknown[] }) => q.queryKey[0],
        ),
      };
    })
    .toEqual({ buster: 'orvio-query-v2', groups: ['shared-replay'] });
});
