import {
  type LocalAllKeysEnvelope,
  validateLocalAllKeysRecord,
  localAllKeysIdentity,
} from './local-allkeys-record';

export interface LocalAllKeysRow {
  identity: string;
  envelope: LocalAllKeysEnvelope;
  bytes: ArrayBuffer;
  title?: string;
  author?: string;
}

export interface LocalAllKeysMetadata {
  identity: string;
  videoId: string;
  audioSha256: string;
  chartSetSha256: string;
  title?: string;
  author?: string;
  sampleRate: number;
  frames: number;
  provenance: 'local-allkeys-v1';
}

type Options = { signal?: AbortSignal };
const DATABASE = 'orvio-local-allkeys-v1';
const STORE = 'sources';
const IDENTITY = /^yt-local-allkeys-[A-Za-z0-9_-]{11}-[a-f0-9]{64}-c[a-f0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason;
}

// Race non-cancellable validation/crypto/open work, while still observing its
// rejection. Transactions additionally listen for abort and roll back writes.
function cancellable<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (ok: boolean, value: unknown) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) reject(signal.reason);
      else if (ok) resolve(value as T);
      else reject(value);
    };
    const abort = () => finish(false, signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return abort();
    try {
      work().then((value) => finish(true, value), (error) => finish(false, error));
    } catch (error) {
      finish(false, error);
    }
  });
}

function plainMetadata(value: unknown, limit: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new TypeError('Expected plain text metadata');
  // Store text only; remove markup delimiters, controls and bidi overrides.
  return value
    .replace(/[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '')
    .trim()
    .slice(0, limit);
}

function metadata(input: { title?: string; author?: string }) {
  const title = plainMetadata(input.title, 200);
  const author = plainMetadata(input.author, 120);
  return {
    ...(title === undefined ? {} : { title }),
    ...(author === undefined ? {} : { author }),
  };
}

function identityOf(envelope: LocalAllKeysEnvelope): string {
  const record = envelope.record;
  const expected = `yt-local-allkeys-${record.videoId}-${record.audioSha256}-c${record.chartSetSha256}`;
  const identity = localAllKeysIdentity(envelope);
  if (!IDENTITY.test(expected) || identity !== expected) {
    throw new Error('Invalid local all-keys identity');
  }
  return identity;
}

async function validatedRow(
  input: Omit<LocalAllKeysRow, 'identity'> & { identity?: string },
  signal?: AbortSignal,
): Promise<LocalAllKeysRow> {
  checkAbort(signal);
  if (!(input.bytes instanceof ArrayBuffer)) throw new TypeError('Expected WAV ArrayBuffer');
  const envelope = await validateLocalAllKeysRecord(input.envelope, { signal });
  checkAbort(signal);
  const identity = identityOf(envelope);
  if (input.identity !== undefined && identity !== input.identity) throw new Error('Local all-keys identity mismatch');
  const digest = await crypto.subtle.digest('SHA-256', input.bytes);
  checkAbort(signal);
  const sha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  if (sha256 !== envelope.record.audioSha256) {
    throw new Error('Local all-keys WAV SHA-256 mismatch');
  }
  return { identity, envelope, bytes: input.bytes, ...metadata(input) };
}

function openDatabase(signal?: AbortSignal): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let request: IDBOpenDBRequest;
    let upgradeError: unknown;
    let upgradeFailed = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      reject(signal?.aborted ? signal.reason : error);
    };
    const abort = () => {
      try { request?.transaction?.abort(); } catch { /* Already finished. */ }
      fail(signal?.reason);
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return abort();
    try {
      request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        if (settled || signal?.aborted) {
          try { request.transaction?.abort(); } catch { /* Already finished. */ }
          return;
        }
        try {
          const store = request.result.createObjectStore(STORE, { keyPath: 'identity' });
          // Key-only indexes allow listing without deserializing any audio or
          // chart envelopes. Optional metadata is absent from its index if unset.
          store.createIndex('metadata', [
            'identity', 'envelope.record.videoId', 'envelope.record.audioSha256',
            'envelope.record.chartSetSha256', 'envelope.record.sampleRate',
            'envelope.record.frames',
          ]);
          store.createIndex('title', ['identity', 'title']);
          store.createIndex('author', ['identity', 'author']);
        } catch (error) {
          upgradeFailed = true;
          upgradeError = error;
          try { request.transaction?.abort(); } catch { /* Preserve cause. */ }
          fail(error);
        }
      };
      request.onerror = () => fail(upgradeFailed ? upgradeError : request.error);
      request.onblocked = () => fail(new Error('Local all-keys database upgrade blocked'));
      request.onsuccess = () => {
        const db = request.result;
        if (settled || signal?.aborted) {
          db.close();
          fail(signal?.reason);
          return;
        }
        settled = true;
        signal?.removeEventListener('abort', abort);
        db.onversionchange = () => db.close();
        resolve(db);
      };
    } catch (error) {
      fail(error);
    }
  });
}

// All callbacks here are synchronous. In particular, no hashing or async
// record validation is allowed between get and add in a live transaction.
function transaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  signal: AbortSignal | undefined,
  run: (store: IDBObjectStore, result: (value: T) => void, fail: (error: unknown) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction | undefined;
    let value: T;
    let failed = false;
    let failure: unknown;
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) reject(signal.reason);
      else if (!ok || failed) reject(failed ? failure : tx?.error);
      else resolve(value);
    };
    const fail = (error: unknown) => {
      if (!failed) { failed = true; failure = error; }
      try {
        if (tx) tx.abort();
        else finish(false);
      } catch {
        finish(false);
      }
    };
    const abort = () => fail(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return abort();
    try {
      tx = db.transaction(STORE, mode);
      tx.oncomplete = () => finish(true);
      tx.onabort = () => finish(false);
      tx.onerror = (event) => {
        const error = (event.target as IDBRequest | null)?.error ?? tx?.error;
        fail(error);
      };
      run(tx.objectStore(STORE), (result) => { value = result; }, fail);
    } catch (error) {
      fail(error);
    }
  });
}

// Validated envelopes are plain JSON data. Compare structurally, independent
// of object property order, without normalizing or overwriting a durable row.
function equalData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.keys(a).sort();
  const right = Object.keys(b).sort();
  return left.length === right.length && left.every((key, index) =>
    key === right[index] && equalData(
      (a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key],
    ),
  );
}

function equalBytes(a: unknown, b: ArrayBuffer): boolean {
  if (!(a instanceof ArrayBuffer) || a.byteLength !== b.byteLength) return false;
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  return left.every((byte, index) => byte === right[index]);
}

export function saveLocalAllKeys(
  input: Omit<LocalAllKeysRow, 'identity'>,
  { signal }: Options = {},
): Promise<LocalAllKeysRow> {
  return cancellable(async () => {
    checkAbort(signal);
    // Snapshot before the first await; never transfer or mutate caller audio.
    const snapshot = structuredClone({
      envelope: input.envelope, bytes: input.bytes, ...metadata(input),
    });
    const row = await validatedRow(snapshot, signal);
    checkAbort(signal);
    const db = await openDatabase(signal);
    try {
      checkAbort(signal);
      return await transaction<LocalAllKeysRow>(db, 'readwrite', signal, (store, result, fail) => {
        const request = store.get(row.identity);
        request.onsuccess = () => {
          try {
            checkAbort(signal);
            const existing = request.result as LocalAllKeysRow | undefined;
            if (existing !== undefined) {
              if (existing.identity !== row.identity ||
                  !equalData(existing.envelope, row.envelope) || !equalBytes(existing.bytes, row.bytes)) {
                throw new Error('Conflicting immutable local all-keys row');
              }
              result({ identity: existing.identity, envelope: existing.envelope,
                bytes: existing.bytes, ...metadata(existing) });
            } else {
              store.add(row);
              result(row);
            }
          } catch (error) { fail(error); }
        };
      });
    } finally { db.close(); }
  }, signal);
}

export function readLocalAllKeys(
  identity: string,
  { signal }: Options = {},
): Promise<LocalAllKeysRow | null> {
  return cancellable(async () => {
    checkAbort(signal);
    if (typeof identity !== 'string' || !IDENTITY.test(identity)) throw new Error('Invalid local all-keys identity');
    const db = await openDatabase(signal);
    let row: LocalAllKeysRow | undefined;
    try {
      checkAbort(signal);
      row = await transaction<LocalAllKeysRow | undefined>(db, 'readonly', signal, (store, result) => {
        const request = store.get(identity);
        request.onsuccess = () => result(request.result);
      });
    } finally { db.close(); }
    checkAbort(signal);
    if (row === undefined) return null;
    if (!row || row.identity !== identity) throw new Error('Local all-keys identity mismatch');
    return validatedRow(row, signal);
  }, signal);
}

export function listLocalAllKeys({ signal }: Options = {}): Promise<LocalAllKeysMetadata[]> {
  return cancellable(async () => {
    checkAbort(signal);
    const db = await openDatabase(signal);
    try {
      checkAbort(signal);
      return await transaction<LocalAllKeysMetadata[]>(db, 'readonly', signal, (store, result, fail) => {
        const rows: LocalAllKeysMetadata[] = [];
        const titles = new Map<string, string>();
        const authors = new Map<string, string>();
        let remaining = 3;
        for (const name of ['metadata', 'title', 'author'] as const) {
          const request = store.index(name).openKeyCursor();
          request.onsuccess = () => {
            try {
              checkAbort(signal);
              const cursor = request.result;
              if (!cursor) {
                if (--remaining === 0) {
                  for (const row of rows) Object.assign(row, metadata({
                    title: titles.get(row.identity), author: authors.get(row.identity),
                  }));
                  result(rows);
                }
                return;
              }
              const key = cursor.key;
              if (!Array.isArray(key) || typeof key[0] !== 'string' || !IDENTITY.test(key[0]) || cursor.primaryKey !== key[0]) {
                throw new Error('Invalid local all-keys metadata index');
              }
              if (name === 'metadata') {
                const [identity, videoId, audioSha256, chartSetSha256, sampleRate, frames] = key;
                if (key.length !== 6 || typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
                    typeof audioSha256 !== 'string' || !HASH.test(audioSha256) ||
                    typeof chartSetSha256 !== 'string' || !HASH.test(chartSetSha256) ||
                    typeof sampleRate !== 'number' || !Number.isSafeInteger(sampleRate) || sampleRate <= 0 ||
                    typeof frames !== 'number' || !Number.isSafeInteger(frames) || frames <= 0 ||
                    identity !== `yt-local-allkeys-${videoId}-${audioSha256}-c${chartSetSha256}`) {
                  throw new Error('Invalid local all-keys metadata index');
                }
                rows.push({ identity, videoId, audioSha256, chartSetSha256, sampleRate, frames, provenance: 'local-allkeys-v1' });
              } else {
                if (key.length !== 2 || typeof key[1] !== 'string') throw new Error('Invalid local all-keys text index');
                (name === 'title' ? titles : authors).set(key[0], key[1]);
              }
              cursor.continue();
            } catch (error) { fail(error); }
          };
        }
      });
    } finally { db.close(); }
  }, signal);
}
