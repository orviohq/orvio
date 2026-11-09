import { verifyOpusRecord } from './opus/opus-record';
import { opus35SourceId } from './opus/opus35-identity';
import { validSourceRecord, verifyChartHashes } from './external-source';
// Move IndexedDB result cloning, structural scans, serialization and hash work
// off the input thread. Only individually verified records leave this worker.
self.onmessage = async ({ data }) => {
  let db: IDBDatabase | undefined;
  try {
    if (data !== 'opus' && data !== 'legacy')
      throw Error('library_discovery_kind');
    const opus = data === 'opus',
      name = opus ? 'orvio.opus35-library.v1' : 'orvio.external-sources.v1',
      store = opus ? 'metadata' : 'records';
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => {
        if (opus) {
          r.result.createObjectStore('metadata', { keyPath: 'key' });
          r.result.createObjectStore('sessions', { keyPath: 'key' });
        } else r.result.createObjectStore('records', { keyPath: 'key' });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    // Snapshot only keys, then read and verify one record at a time. Never
    // materialize a second full-library graph while the UI receives rows.
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const r = db!
        .transaction(store, 'readonly')
        .objectStore(store)
        .getAllKeys();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    for (const key of keys) {
      const row = await new Promise<any>((resolve, reject) => {
        const r = db!
          .transaction(store, 'readonly')
          .objectStore(store)
          .get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (!row) throw Error('library_discovery_changed');
      const valid = opus
        ? row?.kind === 'opus35-source' &&
          typeof row.title === 'string' &&
          row.key === opus35SourceId(row.record) &&
          (await verifyOpusRecord(row.record))
        : validSourceRecord(row.record) &&
          (await verifyChartHashes(row.record));
      if (!valid) throw Error('library_discovery_integrity');
      const bytes = new TextEncoder().encode(
        JSON.stringify(opus ? row : row.record),
      );
      // Transfer an owned compact buffer. Structured-cloning thousands of note
      // objects into the input thread otherwise recreates the same GC stall.
      self.postMessage(
        { kind: 'row', bytes: bytes.buffer },
        { transfer: [bytes.buffer] },
      );
    }
    self.postMessage({ kind: 'done' });
  } catch {
    self.postMessage({ kind: 'error' });
  } finally {
    db?.close();
  }
};
