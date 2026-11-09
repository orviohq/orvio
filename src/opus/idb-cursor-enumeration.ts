// Read every object-store cursor row in ONE readonly transaction/snapshot.
// Pages are allocation batches, never record limits. No await/timer between
// cursor callbacks: IDB cannot auto-close a transaction between pages.
// The owning transaction resolves only on tx.oncomplete and rejects aborts;
// no partial enumeration is published on cancellation/storage failure.
export function enumerateCursorPages<T>(
  store: IDBObjectStore,
  done: (rows: T[]) => void,
  signal?: AbortSignal,
): void {
  const pages: T[][] = [];
  let page: T[] = [];
  const request = store.openCursor();
  request.onsuccess = () => {
    if (signal?.aborted) {
      try {
        store.transaction.abort();
      } catch {}
      return;
    }
    const cursor = request.result;
    if (!cursor) {
      if (page.length) pages.push(page);
      const rows: T[] = [];
      for (const batch of pages) for (const row of batch) rows.push(row);
      done(rows);
      return;
    }
    page.push(cursor.value as T);
    if (page.length === 128) {
      pages.push(page);
      page = [];
    }
    cursor.continue();
  };
}
