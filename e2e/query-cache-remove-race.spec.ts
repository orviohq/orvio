import { test, expect } from '@playwright/test';
test('fresh eligible entry removed during first save cannot resurrect', async ({
  page,
}) => {
  await page.goto('/song/#v=5&d=private-replay');
  await expect(page.locator('#song-add')).toBeDisabled();
  await page.evaluate(async () => {
    const { queryClient, queryKeys, queryCacheRestored } = await import(
      /* @vite-ignore */ String('/src/query-client.ts')
    );
    await queryCacheRestored;
    const k = queryKeys.canonicalMetadata('AAAAAAAAAAA', 'aa'.repeat(32));
    queryClient.setQueryData(k, { title: 'removed' });
    queryClient.removeQueries({ queryKey: k });
  });
  await page.waitForTimeout(1700);
  const rows = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = indexedDB.open('orvio.query-cache.v1', 1);
      q.onupgradeneeded = () => q.transaction?.abort();
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => {
        if ((q.error as any)?.name === 'AbortError') {
          resolve(null as any);
        } else {
          reject(q.error);
        }
      };
    });
    if (!db) return [] as any;
    try {
      return await new Promise<any[]>((resolve, reject) => {
        const q = db
          .transaction('client')
          .objectStore('client')
          .get('orvio-query-client');
        q.onsuccess = () => resolve(JSON.parse(q.result).clientState.queries);
        q.onerror = () => reject(q.error);
      });
    } finally {
      db.close();
    }
  });
  expect(rows).toEqual([]);
  const names = await page.evaluate(async () =>
    (await indexedDB.databases()).map((x) => x.name),
  );
  // reload: the removed entry must not resurrect
  await page.reload();
  await expect(page.locator('#song-add')).toBeDisabled();
  const rows2 = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
      const q = indexedDB.open('orvio.query-cache.v1', 1);
      q.onupgradeneeded = () => q.transaction?.abort();
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => {
        (q.error as any)?.name === 'AbortError'
          ? resolve(null)
          : reject(q.error);
      };
    });
    if (!db) return [] as any;
    try {
      return await new Promise<any[]>((resolve, reject) => {
        const q = db
          .transaction('client')
          .objectStore('client')
          .get('orvio-query-client');
        q.onsuccess = () =>
          resolve(q.result ? JSON.parse(q.result).clientState.queries : []);
        q.onerror = () => reject(q.error);
      });
    } finally {
      db.close();
    }
  });
  expect(rows2).toEqual([]);
  expect(names).toEqual([]);
});

test('removal while nonempty IDB save is in flight converges to empty', async ({
  page,
}) => {
  await page.goto('/song/#v=5&d=private-replay');
  await expect(page.locator('#song-add')).toBeDisabled();
  await page.evaluate(async () => {
    const { queryClient, queryKeys, queryReady } = await import(
      /* @vite-ignore */ String('/src/query-client.ts')
    );
    await queryReady;
    const native = IDBObjectStore.prototype.put;
    let first = true;
    IDBObjectStore.prototype.put = function (...args: any[]) {
      const result = native.apply(this, args as any);
      if (first && this.transaction.db.name === 'orvio.query-cache.v1') {
        first = false;
        (window as any).__firstSaveStarted = true;
        const tx = this.transaction;
        Object.defineProperty(tx, 'oncomplete', {
          set(fn) {
            tx.addEventListener('complete', (e) =>
              setTimeout(() => fn.call(tx, e), 300),
            );
          },
          get() {
            return null;
          },
          configurable: true,
        });
      }
      return result;
    };
    const key = queryKeys.canonicalMetadata('AAAAAAAAAAA', 'bb'.repeat(32));
    (window as any).__remove = () =>
      queryClient.removeQueries({ queryKey: key });
    queryClient.setQueryData(key, { title: 'removed-in-flight' });
  });
  await page.waitForFunction(() => (window as any).__firstSaveStarted);
  await page.evaluate(() => (window as any).__remove());
  await page.waitForTimeout(1600);
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open('orvio.query-cache.v1', 1);
      q.onsuccess = () => resolve(q.result);
    });
    try {
      return await new Promise<any>((resolve) => {
        const q = db
          .transaction('client')
          .objectStore('client')
          .get('orvio-query-client');
        q.onsuccess = () => resolve(JSON.parse(q.result));
      });
    } finally {
      db.close();
    }
  });
  expect(stored.clientState.queries).toEqual([]);
  await page.reload();
  await expect(page.locator('#song-add')).toBeDisabled();
  const count = await page.evaluate(async () => {
    const { queryClient, queryReady } = await import(
      /* @vite-ignore */ String('/src/query-client.ts')
    );
    await queryReady;
    return queryClient
      .getQueryCache()
      .getAll()
      .filter((q: any) => q.queryKey[0] === 'canonical-metadata').length;
  });
  expect(count).toBe(0);
});
