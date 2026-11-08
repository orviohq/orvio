import { AUDIO_MAX_BYTES } from './audio-limits.mjs';
import { externalSource, sourceId, sourceAudioId } from './external-catalog';
import {
  validSourceRecord,
  verifyChartHashes,
  type SourceRecord,
} from './external-source';
import {
  validateRuntimeReplay,
  replayMatches,
  type RuntimeReplay,
} from './replay';
import type { SharedResult } from './share';
import { inspectWav } from './canonical-pcm.mjs';
type Result = Omit<SharedResult, 'song'> & { song: string };
export interface LocalAsset {
  key: string;
  title: string;
  author?: string;
  jobId?: string;
  bytes: ArrayBuffer;
}
export interface LocalSession {
  key: string;
  source: SourceRecord;
  replay: RuntimeReplay;
  result: Result;
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('orvio.external-library.v1', 2);
    r.onupgradeneeded = () => {
      for (const s of ['audio', 'sessions', 'metadata'])
        if (!r.result.objectStoreNames.contains(s))
          r.result.createObjectStore(s, { keyPath: 'key' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(Error('Local library unavailable'));
  });
}
async function put(store: string, value: unknown) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(store, 'readwrite');
      t.objectStore(store).put(value);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
async function get(store: string, key: string): Promise<any> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction(store, 'readonly').objectStore(store).get(key);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function saveLocalAudio(
  record: SourceRecord,
  title: string,
  jobId: string | undefined,
  bytes: ArrayBuffer,
  author?: string,
) {
  const previous = await localMetadata(record);
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['audio', 'metadata'], 'readwrite');
      const meta = {
        ...previous,
        key: sourceId(record),
        title: title.slice(0, 300),
        author: author?.slice(0, 100),
        jobId,
      };
      tx.objectStore('audio').put({
        ...meta,
        key: sourceAudioId(record),
        bytes,
      });
      tx.objectStore('metadata').put(meta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function localAudio(
  record: SourceRecord,
): Promise<LocalAsset | null> {
  const a = await get('audio', sourceAudioId(record));
  if (!a) return null;
  if (
    !(a.bytes instanceof ArrayBuffer) ||
    a.bytes.byteLength > AUDIO_MAX_BYTES ||
    typeof a.title !== 'string' ||
    a.title.length > 300 ||
    (a.jobId !== undefined && typeof a.jobId !== 'string')
  )
    throw Error('Invalid local audio');
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', a.bytes)),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
  if (hash !== record.audioSha256) throw Error('Saved audio integrity failed');
  const p = inspectWav(a.bytes);
  if (p.sampleRate !== record.sampleRate || p.frames !== record.frames)
    throw Error('Saved audio format changed');
  return a;
}
export async function saveLocalSession(replay: RuntimeReplay, result: Result) {
  const item = externalSource(replay.song);
  if (!item || !replayMatches(replay, result))
    throw Error('Replay does not match');
  const key = replay.song + ':' + crypto.randomUUID();
  await put('sessions', {
    key,
    source: item.record,
    replay,
    result,
  });
  await put('metadata', {
    ...(await localMetadata(item.record)),
    key: replay.song,
    latestSession: key,
  });
  return key;
}
export async function readLocalSession(
  key: string,
): Promise<LocalSession | null> {
  let raw = await get('sessions', key);
  if (!raw && !key.includes(':')) {
    const metadata = await get('metadata', key);
    if (metadata?.latestSession)
      raw = await get('sessions', metadata.latestSession);
  }

  if (!raw) return null;
  if (
    !validSourceRecord(raw.source) ||
    sourceId(raw.source) !== raw.replay?.song ||
    !(await verifyChartHashes(raw.source))
  )
    throw Error('Local replay source failed');
  const item = externalSource(raw.replay.song);
  if (
    !item ||
    item.record.audioSha256 !== raw.source.audioSha256 ||
    JSON.stringify(item.record.charts) !== JSON.stringify(raw.source.charts)
  )
    throw Error('Local replay chart changed');
  const replay = validateRuntimeReplay(
    raw.replay,
    (id) => id === raw.replay.song,
  );
  if (!replay || !replayMatches(replay, raw.result))
    throw Error('Local replay verification failed');
  return { ...raw, replay };
}

export async function localMetadata(
  record: SourceRecord,
): Promise<Omit<LocalAsset, 'bytes'> | null> {
  const raw = await get('metadata', sourceId(record));
  if (!raw) return null;
  if (
    typeof raw.title !== 'string' ||
    raw.title.length > 300 ||
    (raw.jobId !== undefined && typeof raw.jobId !== 'string')
  )
    throw Error('Invalid metadata');
  return raw;
}

async function getAll(store: string): Promise<any[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const r = db.transaction(store, 'readonly').objectStore(store).getAll();
      r.onsuccess = () => resolve(r.result ?? []);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}

export interface ListedLocalSession extends LocalSession {
  title?: string;
}

// A24: enumerate every saved local session for the dedicated replay page.
// The old schema carries no timestamp, so no date ordering is invented here.
// Each entry goes through the full readLocalSession validation contract;
// corrupt archives are skipped and left untouched, never rewritten.
export async function listLocalSessions(): Promise<ListedLocalSession[]> {
  const raws = await getAll('sessions');
  const out: ListedLocalSession[] = [];
  for (const raw of raws) {
    if (!raw || typeof raw.key !== 'string') continue;
    try {
      const session = await readLocalSession(raw.key);
      if (!session) continue;
      const meta = await localMetadata(session.source).catch(() => null);
      out.push({
        ...session,
        title: typeof meta?.title === 'string' ? meta.title : undefined,
      });
    } catch {
      /* Keep corrupt archives untouched, never rewrite them. */
    }
  }
  return out;
}

/** Display metadata only: preserve keys, audio bytes, sessions, source and hashes. */
export async function updateLocalDisplayMetadata(
  record: SourceRecord,
  title: string,
  author: string | null,
) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['audio', 'metadata'], 'readwrite');
      for (const [store, key] of [
        ['audio', sourceAudioId(record)],
        ['metadata', sourceId(record)],
      ]) {
        const target = tx.objectStore(store),
          r = target.get(key);
        r.onsuccess = () => {
          if (r.result)
            target.put({
              ...r.result,
              title,
              ...(author !== null ? { author } : {}),
            });
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
