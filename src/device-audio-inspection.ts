import { AUDIO_MAX_BYTES } from './audio-limits.mjs';
import { inspectWav } from './canonical-pcm.mjs';
import { sourceAudioId } from './external-catalog';
import {
  recordKey,
  validSourceRecord,
  verifyChartHashes,
  type SourceRecord,
} from './external-source';
export type DeviceAudioState =
  'ready' | 'legacy_audio' | 'missing' | 'invalid' | 'unavailable';
async function existingDatabase(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    let absent = false,
      settled = false;
    const finish = (db: IDBDatabase | null, error?: unknown) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(db);
    };
    const timer = setTimeout(
      () => finish(null, Error('Storage unavailable')),
      5000,
    );
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(name);
    } catch (error) {
      finish(null, error);
      return;
    }
    request.onupgradeneeded = () => {
      absent = true;
      request.transaction!.abort();
    };
    request.onerror = () =>
      finish(
        null,
        absent ? undefined : (request.error ?? Error('Storage unavailable')),
      );
    request.onblocked = () => finish(null, Error('Storage unavailable'));
    request.onsuccess = () => finish(request.result);
  });
}
async function read(
  db: IDBDatabase | null,
  store: string,
  key: string,
): Promise<any> {
  if (!db || !db.objectStoreNames.contains(store)) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).get(key);
    let value: unknown;
    request.onsuccess = () => {
      value = request.result ?? null;
    };
    tx.oncomplete = () => resolve(value);
    tx.onerror = tx.onabort = () =>
      reject(tx.error ?? Error('Storage unavailable'));
  });
}
async function recordsForVideo(
  db: IDBDatabase | null,
  videoId: string,
): Promise<{ key: string; record: SourceRecord }[]> {
  if (!db || !db.objectStoreNames.contains('records')) return [];
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly');
    const request = tx
      .objectStore('records')
      .openCursor(IDBKeyRange.bound(videoId + ':', videoId + ':\uffff'));
    const records: { key: string; record: SourceRecord }[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      records.push({ key: String(cursor.key), record: cursor.value.record });
      cursor.continue();
    };
    tx.oncomplete = () => resolve(records);
    tx.onerror = tx.onabort = () =>
      reject(tx.error ?? Error('Storage unavailable'));
  });
}
async function digest(bytes: BufferSource) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
/** Selected song only. No fetch, storage writes, exports, chart promotion or recovery. */
export async function inspectDeviceAudio(
  videoId: string,
): Promise<DeviceAudioState> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return 'invalid';
  let sourceDb: IDBDatabase | null = null,
    audioDb: IDBDatabase | null = null;
  try {
    sourceDb = await existingDatabase('orvio.external-sources.v1');
    audioDb = await existingDatabase('orvio.external-library.v1');
    const rows = await recordsForVideo(sourceDb, videoId);
    const raw = localStorage.getItem('orvio.canonical-library.v1');
    let reference: any;
    if (raw) {
      let refs: unknown;
      try {
        refs = JSON.parse(raw);
      } catch {
        return 'invalid';
      }
      if (!Array.isArray(refs)) return 'invalid';
      reference = refs.find((x) => x?.videoId === videoId);
      if (
        reference &&
        ![
          'audioSha256',
          'chartSetSha256',
          'recordSha256',
          'localRecordSha256',
        ].every((k) => /^[a-f0-9]{64}$/.test(reference[k]))
      )
        return 'invalid';
    }
    let found = false,
      canonical = false;
    for (const { key, record } of rows) {
      if (
        !validSourceRecord(record) ||
        record.videoId !== videoId ||
        key !== recordKey(record) ||
        !(await verifyChartHashes(record))
      )
        return 'invalid';
      const asset = await read(audioDb, 'audio', sourceAudioId(record));
      if (!asset) continue;
      if (
        !(asset.bytes instanceof ArrayBuffer) ||
        typeof asset.title !== 'string' ||
        asset.title.length > 300 ||
        typeof asset.jobId !== 'string' ||
        asset.bytes.byteLength > AUDIO_MAX_BYTES ||
        (await digest(asset.bytes)) !== record.audioSha256
      )
        return 'invalid';
      try {
        const wav = inspectWav(asset.bytes);
        if (
          wav.frames !== record.frames ||
          wav.sampleRate !== record.sampleRate
        )
          return 'invalid';
      } catch {
        return 'invalid';
      }
      found = true;
      if (
        reference?.audioSha256 === record.audioSha256 &&
        reference?.chartSetSha256 === record.chartSetSha256
      ) {
        if (
          (await digest(new TextEncoder().encode(JSON.stringify(record)))) !==
          reference.localRecordSha256
        )
          return 'invalid';
        canonical = true;
      }
    }
    return canonical ? 'ready' : found ? 'legacy_audio' : 'missing';
  } catch {
    return 'unavailable';
  } finally {
    sourceDb?.close();
    audioDb?.close();
  }
}
