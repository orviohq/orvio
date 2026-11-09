import { discoverLibrary } from './library-discovery';
import {
  recordKey,
  validSourceRecord,
  verifyChartHashes,
  type SourceRecord,
} from './external-source';
const DATABASE = 'orvio.external-sources.v1';
const STORE = 'records';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Local chart storage unavailable'));
  });
}
/** Add-only pin. A source or update cannot silently overwrite an existing record. */
export async function pinSource(
  record: SourceRecord,
  signal?: AbortSignal,
): Promise<'saved' | 'already-pinned'> {
  signal?.throwIfAborted();
  const snapshot = structuredClone(record);
  if (!(await verifyChartHashes(snapshot)))
    throw new Error('Invalid source chart integrity');
  signal?.throwIfAborted();
  const key = recordKey(snapshot),
    db = await open();
  try {
    signal?.throwIfAborted();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite'),
        store = tx.objectStore(STORE);
      const abort = () => {
        try {
          tx.abort();
        } catch {}
      };
      signal?.addEventListener('abort', abort, { once: true });
      const cleanup = () => signal?.removeEventListener('abort', abort);
      if (signal?.aborted) abort();
      let status: 'saved' | 'already-pinned' = 'saved';
      const existing = store.get(key);
      existing.onsuccess = () => {
        if (existing.result) {
          status = 'already-pinned';
          return;
        }
        store.add({ key, record: snapshot, pinnedAt: Date.now() });
      };
      tx.oncomplete = () => {
        cleanup();
        resolve(status);
      };
      tx.onerror = () => {
        cleanup();
        reject(tx.error);
      };
      tx.onabort = () => {
        cleanup();
        reject(
          signal?.aborted
            ? signal.reason
            : (tx.error ?? new Error('Local chart save interrupted')),
        );
      };
    });
  } finally {
    db.close();
  }
}
/** Corruption/missing data is a truthful local recovery condition, never a regeneration hint. */
export async function readPinnedSource(
  videoId: string,
  audioSha256: string,
  chartSetSha256?: string,
): Promise<SourceRecord | null> {
  const db = await open();
  let raw: unknown;
  try {
    raw = await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE, 'readonly')
        .objectStore(STORE)
        .get(recordKey({ videoId, audioSha256, chartSetSha256 }));
      request.onsuccess = () => resolve(request.result?.record ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
  if (raw === null) return null;
  if (
    !validSourceRecord(raw) ||
    raw.videoId !== videoId ||
    raw.audioSha256 !== audioSha256 ||
    raw.chartSetSha256 !== chartSetSha256 ||
    !(await verifyChartHashes(raw))
  )
    throw new Error('Saved chart integrity failed');
  return raw;
}

/** Local discovery is independent of the newly downloaded artifact identity. */
export async function listPinnedSources(
  videoId: string,
): Promise<SourceRecord[]> {
  const db = await open();
  let rows: { key: string; record: unknown; pinnedAt?: number }[];
  try {
    rows = await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE, 'readonly')
        .objectStore(STORE)
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
  const found: SourceRecord[] = [];
  for (const row of rows.sort(
    (a, b) => (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0),
  )) {
    const record = row.record;
    if (row.key.startsWith(videoId + ':')) {
      if (!validSourceRecord(record) || record.videoId !== videoId)
        throw Error('Saved chart integrity failed');
      if (!(await verifyChartHashes(record)))
        throw Error('Saved chart integrity failed');
      found.push(record);
    }
  }
  return found;
}
export async function allPinnedSources(): Promise<SourceRecord[]> {
  return discoverLibrary<SourceRecord>('legacy');
}
