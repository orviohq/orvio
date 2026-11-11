import type { RuntimeReplay } from './replay';
import { readLocalAllKeys } from './local-allkeys-store';
import { verifyLocalAllKeysReplay } from './local-allkeys-replay';
import { installLocalAllKeysSource } from './local-allkeys-catalog';

const DATABASE = 'orvio-local-allkeys-sessions-v1';
const STORE = 'sessions';
const PREFIX = 'local-allkeys-session:';
const KEY = /^local-allkeys-session:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    let failed = false;
    request.onupgradeneeded = () => {
      if (failed) {
        request.transaction?.abort();
        return;
      }
      request.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onerror = () => {
      failed = true;
      reject(request.error);
    };
    request.onblocked = () => {
      failed = true;
      reject(Error('Local all-keys sessions database blocked'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (failed) return db.close();
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let request: IDBRequest<T>;
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error ?? Error('Local all-keys session transaction aborted'));
      tx.onerror = (event) => reject((event.target as IDBRequest)?.error ?? tx.error);
      try {
        request = run(tx.objectStore(STORE));
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  } finally {
    db.close();
  }
}

export async function saveLocalAllKeysSession(replay: RuntimeReplay): Promise<string> {
  const snapshot = structuredClone(replay);
  const row = await readLocalAllKeys(snapshot.song);
  if (!row) throw Error('Local all-keys session audio missing');
  const verified = await verifyLocalAllKeysReplay(row.envelope, snapshot);
  const key = PREFIX + crypto.randomUUID();
  await transaction('readwrite', (store) => store.add({
    key,
    createdAt: Date.now(),
    sourceIdentity: verified.identity,
    replay: verified.replay,
  }));
  return key;
}

export async function readLocalAllKeysSession(key: string) {
  if (typeof key !== 'string' || !KEY.test(key))
    throw Error('Invalid local all-keys session key');
  const raw: unknown = await transaction('readonly', (store) => store.get(key));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw Error('Local all-keys session missing or invalid');
  const saved = raw as Record<string, unknown>;
  if (
    Object.keys(saved).length !== 4 ||
    !['key', 'createdAt', 'sourceIdentity', 'replay'].every((field) => Object.hasOwn(saved, field)) ||
    saved.key !== key ||
    typeof saved.createdAt !== 'number' ||
    !Number.isSafeInteger(saved.createdAt) ||
    saved.createdAt <= 0 ||
    typeof saved.sourceIdentity !== 'string'
  ) throw Error('Invalid local all-keys session');
  const row = await readLocalAllKeys(saved.sourceIdentity);
  if (!row) throw Error('Local all-keys session audio missing');
  const verified = await verifyLocalAllKeysReplay(row.envelope, saved.replay);
  if (verified.identity !== saved.sourceIdentity)
    throw Error('Local all-keys session identity mismatch');
  const item = await installLocalAllKeysSource(row.envelope, row.title, row.author);
  return {
    key,
    createdAt: saved.createdAt,
    sourceIdentity: verified.identity,
    replay: verified.replay,
    result: verified.result,
    kind: 'local-allkeys' as const,
    chart: verified.frozenNotes,
    song: item.song,
    title: item.song.title,
    playedAt: saved.createdAt,
    source: verified.record.record,
  };
}

export async function listLocalAllKeysSessions() {
  const keys = await transaction('readonly', (store) => store.getAllKeys());
  const sessions: Awaited<ReturnType<typeof readLocalAllKeysSession>>[] = [];
  for (const key of keys) {
    if (typeof key !== 'string') continue;
    try {
      sessions.push(await readLocalAllKeysSession(key));
    } catch {
      // Preserve unreadable rows while keeping healthy sessions available.
    }
  }
  return sessions;
}
