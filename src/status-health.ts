import { AUDIO_CACHE_VERSION } from './audio-cache';
import { directYoutubeMetadataUrl } from './youtube-direct-metadata';

export type HealthArea = 'access' | 'playback' | 'youtube-add';
export type HealthState = 'healthy' | 'degraded' | 'unknown';
export interface HealthResult {
  state: HealthState;
  checkedAt: string;
  detail?: string;
}
type Observation = Omit<HealthResult, 'checkedAt'>;

// Read existing caches without creating a database or loading audio.
async function access(signal: AbortSignal): Promise<Observation> {
  if (typeof indexedDB === 'undefined')
    return Promise.resolve({
      state: 'degraded',
      detail: 'IndexedDB unavailable',
    });
  const readExisting = (
    name: string,
    store: string,
    schema?: (db: IDBDatabase, store: IDBObjectStore) => boolean,
  ): Promise<Observation> => new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest | undefined;
    let db: IDBDatabase | undefined;
    let transaction: IDBTransaction | undefined;
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      try {
        (transaction ?? request?.transaction)?.abort();
      } catch {}
      db?.close();
      reject(signal.reason);
    };
    const finish = (state: HealthState, detail: string) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      db?.close();
      resolve({ state, detail });
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) return abort();
    try {
      request = indexedDB.open(name, 1);
    } catch {
      finish('unknown', 'Local cache unavailable');
      return;
    }
    const opening = request;
    request.onupgradeneeded = () => {
      try {
        opening.transaction?.abort();
      } catch {}
      // Upgrade exposes a connection even when abort prevents its creation.
      opening.result?.close();
      finish('unknown', 'Local cache not initialized');
    };
    request.onblocked = () => finish('unknown', 'Local cache blocked');
    request.onerror = () => finish('unknown', 'Local cache unavailable');
    request.onsuccess = () => {
      db = opening.result;
      if (settled || signal.aborted) {
        db.close();
        return;
      }
      try {
        transaction = db.transaction(store, 'readonly');
        const objectStore = transaction.objectStore(store);
        if (schema && !schema(db, objectStore)) {
          finish('unknown', 'Local cache read failed');
          return;
        }
        // A missing key is fine: successful completion proves the store is readable.
        const key = objectStore.getKey(AUDIO_CACHE_VERSION + ':0');
        if (key) key.onerror = () => finish('unknown', 'Local cache read failed');
        transaction.oncomplete = () =>
          finish('healthy', 'Local cache readable');
        transaction.onabort = transaction.onerror = () =>
          finish('unknown', 'Local cache read failed');
      } catch {
        finish('unknown', 'Local cache read failed');
      }
    };
  });
  const legacy = await readExisting('orvio-audio', 'tracks');
  if (legacy.state === 'healthy') return legacy;
  return readExisting('orvio-local-allkeys-v1', 'sources', (db, store) => {
    const fields = [
      'identity',
      'envelope.record.videoId',
      'envelope.record.audioSha256',
      'envelope.record.chartSetSha256',
      'envelope.record.sampleRate',
      'envelope.record.frames',
    ];
    const keyPath = store.index('metadata').keyPath;
    return db.version === 1 && store.keyPath === 'identity' &&
      Array.isArray(keyPath) && keyPath.length === fields.length &&
      fields.every((field, index) => keyPath[index] === field);
  });
}

// One silent PCM sample in a WAV container. No source node, output or fetch.
function silentWav(): ArrayBuffer {
  const bytes = new ArrayBuffer(46);
  const view = new DataView(bytes);
  view.setUint32(0, 0x52494646);
  view.setUint32(4, 38, true);
  view.setUint32(8, 0x57415645);
  view.setUint32(12, 0x666d7420);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 44100, true);
  view.setUint32(28, 88200, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461);
  view.setUint32(40, 2, true);
  return bytes;
}

async function playback(signal: AbortSignal): Promise<Observation> {
  if (typeof AudioContext === 'undefined')
    return { state: 'degraded', detail: 'AudioContext unavailable' };
  const context = new AudioContext();
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    try {
      void context.close().catch(() => {});
    } catch {}
  };
  signal.addEventListener('abort', close, { once: true });
  try {
    if (typeof context.decodeAudioData !== 'function')
      return { state: 'degraded', detail: 'decodeAudioData unavailable' };
    const decoded = await context.decodeAudioData(silentWav());
    return decoded.length > 0
      ? {
          state: 'healthy',
          detail: 'AudioContext + PCM decode; output untested',
        }
      : { state: 'degraded', detail: 'PCM decode failed' };
  } finally {
    signal.removeEventListener('abort', close);
    close();
  }
}

async function youtubeAdd(signal: AbortSignal): Promise<Observation> {
  const publicKey = import.meta.env.PUBLIC_YOUTUBE_API_KEY ?? '';
  if (!publicKey)
    return { state: 'unknown', detail: 'Metadata API key not configured' };
  // A fixed metadata-only sample, using the same endpoint/auth as direct imports.
  const videoId = 'WGm2HmXeeRI';
  const response = await fetch(directYoutubeMetadataUrl(videoId), {
    method: 'GET',
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${publicKey}` },
    signal,
  });
  if (response.status !== 200) {
    void response.body?.cancel().catch(() => {});
    return {
      state: 'degraded',
      detail: `Metadata HTTP ${response.status}`,
    };
  }
  const metadata = await response.json();
  if (
    metadata?.id !== videoId ||
    typeof metadata.title !== 'string' ||
    !metadata.title.trim()
  )
    return { state: 'unknown', detail: 'Unrecognized metadata response' };
  return {
    state: 'healthy',
    detail: 'Metadata readable; audio import untested',
  };
}

/** On demand only. Race even non-cooperative APIs against the same deadline. */
export async function checkArea(area: HealthArea): Promise<HealthResult> {
  let signal: AbortSignal | undefined;
  let abort: (() => void) | undefined;
  try {
    signal = AbortSignal.timeout(5000);
    const deadline = new Promise<Observation>((resolve) => {
      abort = () => resolve({ state: 'unknown', detail: 'Check timed out' });
      signal!.addEventListener('abort', abort, { once: true });
    });
    const work =
      area === 'access'
        ? access(signal)
        : area === 'playback'
          ? playback(signal)
          : area === 'youtube-add'
            ? youtubeAdd(signal)
            : Promise.resolve<Observation>({ state: 'unknown' });
    const result = await Promise.race([work, deadline]);
    return { ...result, checkedAt: new Date().toISOString() };
  } catch {
    return {
      state: 'unknown',
      checkedAt: new Date().toISOString(),
      detail: 'Check unavailable',
    };
  } finally {
    if (abort) signal?.removeEventListener('abort', abort);
  }
}
