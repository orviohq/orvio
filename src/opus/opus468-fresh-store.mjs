// PRIVATE new fresh-reader-aware store. No old journal API, verdict retention,
// public transport, catalog registration, Engine/audio or share execution.
import { createOpus468FreshChartReader } from './opus468-fresh-reader.mjs';
const copy = (x) => structuredClone(x),
  fail = (code) => {
    throw Error(code);
  };
const STORE = 'extensions',
  DB = 'orvio.opus468.fresh-extensions.v1';
async function transact(factory, name, mode, work, signal) {
  signal?.throwIfAborted();
  const db = await new Promise((resolve, reject) => {
    const r = factory.open(name, 1);
    let stopped = false;
    const abort = () => {
      stopped = true;
      reject(signal.reason);
    };
    signal?.addEventListener('abort', abort, { once: true });
    const cleanup = () => signal?.removeEventListener('abort', abort);
    r.onupgradeneeded = () =>
      r.result.createObjectStore(STORE, { keyPath: 'key' });
    r.onerror = () => {
      cleanup();
      reject(r.error);
    };
    r.onblocked = () => {
      stopped = true;
      cleanup();
      reject(Error('fresh_storage_blocked'));
    };
    r.onsuccess = () => {
      cleanup();
      const db = r.result;
      db.onversionchange = () => db.close();
      if (stopped || signal?.aborted) {
        db.close();
        if (signal?.aborted) reject(signal.reason);
        return;
      }
      resolve(db);
    };
  });
  try {
    signal?.throwIfAborted();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result, failure;
      const abort = () => {
        try {
          tx.abort();
        } catch {}
      };
      const stop = (e) => {
        failure = e;
        abort();
      };
      const cleanup = () => signal?.removeEventListener('abort', abort);
      tx.oncomplete = () => {
        cleanup();
        resolve(result);
      };
      tx.onabort = () => {
        cleanup();
        reject(
          failure ??
            (signal?.aborted ? signal.reason : tx.error) ??
            Error('fresh_storage_aborted'),
        );
      };
      tx.onerror = () => {};
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) {
        abort();
        return;
      }
      try {
        work(
          tx.objectStore(STORE),
          (x) => {
            result = x;
          },
          stop,
        );
      } catch (e) {
        stop(e);
      }
    });
  } finally {
    db.close();
  }
}
const equalRow = (a, b) =>
  !!a &&
  Object.keys(a).length === 5 &&
  a.version === b.version &&
  a.key === b.key &&
  JSON.stringify(a.request) === JSON.stringify(b.request) &&
  JSON.stringify(a.selection) === JSON.stringify(b.selection) &&
  a.descriptorBytes instanceof Uint8Array &&
  a.descriptorBytes.length === b.descriptorBytes.length &&
  a.descriptorBytes.every((x, i) => x === b.descriptorBytes[i]);
/** readerOptions includes reviewed BUILD-owned policy/code/verifier/transport.
 * No per-pin dependency injection. A stored row never supplies trustedExchange
 * or policy. The store retains local inputs only and revalidates via a FRESH
 * exchange on each pin/restore/read. No verdict/nonce/journal receipt is stored.
 * Atomicity covers this separate DB only, never the legacy library database.
 */
export function createOpus468FreshStore({
  readerOptions = {},
  makeReader = createOpus468FreshChartReader,
  indexedDB = globalThis.indexedDB,
  databaseName = DB,
} = {}) {
  const reader = makeReader(readerOptions),
    admitted = new Set();
  if (!indexedDB || typeof indexedDB.open !== 'function')
    fail('fresh_storage_unavailable');
  async function validateRow(row, selection, signal) {
    if (
      !row ||
      Object.keys(row).length !== 5 ||
      row.version !== 1 ||
      typeof row.key !== 'string' ||
      !(row.descriptorBytes instanceof Uint8Array)
    )
      fail('fresh_saved_shape');
    const chart = await reader.readChart(
      row.request,
      row.descriptorBytes,
      selection,
      { signal },
    );
    if (chart.song !== row.key) fail('fresh_saved_identity');
    return chart;
  }
  async function readRow(song, signal) {
    return transact(
      indexedDB,
      databaseName,
      'readonly',
      (store, done) => {
        const r = store.get(song);
        r.onsuccess = () => done(r.result ?? null);
      },
      signal,
    );
  }
  return Object.freeze({
    async pin(request, descriptorBytes, selection, { signal } = {}) {
      const input = copy(request),
        bytes = copy(descriptorBytes),
        choice = copy(selection);
      const chart = await reader.readChart(input, bytes, choice, { signal });
      const row = {
        version: 1,
        key: chart.song,
        request: input,
        descriptorBytes: bytes,
        selection: choice,
      };
      const status = await transact(
        indexedDB,
        databaseName,
        'readwrite',
        (store, done, stop) => {
          const r = store.get(row.key);
          r.onsuccess = () => {
            try {
              if (r.result !== undefined) {
                // Selection is a local pin default, not part of extension identity. A
                // different chosen mode must not overwrite the first saved preference.
                const existing = { ...row, selection: r.result.selection };
                if (!equalRow(r.result, existing)) fail('fresh_pin_conflict');
                done('already-pinned');
              } else {
                store.add(row);
                done('saved');
              }
            } catch (e) {
              stop(e);
            }
          };
        },
        signal,
      );
      admitted.add(chart.song);
      return { song: chart.song, status, localPinCommitted: true };
    },
    async restore(song, { signal } = {}) {
      const row = await readRow(song, signal);
      if (row === null) return null;
      await validateRow(row, row.selection, signal);
      admitted.add(song);
      return { song, localPinCommitted: true };
    },
    async readChart(song, selection, { signal } = {}) {
      const choice = copy(selection);
      if (!admitted.has(song)) fail('fresh_pin_not_restored');
      // Read the CURRENT local row again. Tampering/deletion after restoration
      // cannot be hidden by an in-memory cached candidate or old authority verdict.
      const row = await readRow(song, signal);
      if (row === null) fail('fresh_pin_missing');
      return validateRow(row, choice, signal);
    },
    size() {
      return admitted.size;
    },
  });
}
