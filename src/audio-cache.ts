import type { Soundtrack } from './audio';
// Bump only when synthesis changes. No network or player data in this database.
export const AUDIO_CACHE_VERSION = 'synth-1';
type Entry = {
  id: string;
  rate: number;
  peak: number;
  channels: Float32Array[];
};
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('orvio-audio', 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore('tracks', { keyPath: 'id' });
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(new Error('storage timeout'));
    }, 1500);
    req.onsuccess = () => {
      clearTimeout(timer);
      if (expired) req.result.close();
      else resolve(req.result);
    };
    req.onerror = () => {
      clearTimeout(timer);
      reject(req.error);
    };
    req.onblocked = () => {
      clearTimeout(timer);
      expired = true;
      reject(new Error('blocked'));
    };
  });
}
export async function cachedAudio(
  id: string,
  context: BaseAudioContext,
): Promise<Soundtrack | undefined> {
  let db: IDBDatabase | undefined;
  try {
    db = await open();
    const entry = await new Promise<Entry | undefined>((resolve, reject) => {
      const req = db!
        .transaction('tracks')
        .objectStore('tracks')
        .get(AUDIO_CACHE_VERSION + ':' + id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (
      !entry ||
      entry.channels.length !== 2 ||
      !entry.channels[0].length ||
      entry.channels[0].length !== entry.channels[1].length ||
      entry.rate !== 44100 ||
      !Number.isFinite(entry.peak) ||
      entry.peak < 0 ||
      entry.channels[0].length > 44100 * 300
    )
      return;
    const buffer = context.createBuffer(
      2,
      entry.channels[0].length,
      entry.rate,
    );
    entry.channels.forEach((data, i) =>
      buffer.copyToChannel(new Float32Array(data), i),
    );
    return { buffer, peak: entry.peak };
  } catch {
    return;
  } finally {
    db?.close();
  }
}
export async function saveAudio(id: string, track: Soundtrack) {
  let db: IDBDatabase | undefined;
  try {
    db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction('tracks', 'readwrite');
      tx.objectStore('tracks').put({
        id: AUDIO_CACHE_VERSION + ':' + id,
        rate: track.buffer.sampleRate,
        peak: track.peak,
        channels: Array.from(
          { length: track.buffer.numberOfChannels },
          (_, i) => track.buffer.getChannelData(i).slice(),
        ),
      } satisfies Entry);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* Storage unavailable/full: in-memory play still works. */
  } finally {
    db?.close();
  }
}
