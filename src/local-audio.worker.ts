import { AUDIO_MAX_BYTES } from './audio-limits.mjs';
import { inspectWav } from './canonical-pcm.mjs';
// Only a fully verified owned buffer crosses to the input thread. Discovery,
// audio verification and cancellation do not change the stored bytes.
self.onmessage = async ({ data }) => {
  let db: IDBDatabase | undefined;
  try {
    const { key, audioSha256, sampleRate, frames } = data;
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = indexedDB.open('orvio.external-library.v1', 2);
      q.onupgradeneeded = () => {
        for (const name of ['audio', 'sessions', 'metadata'])
          if (!q.result.objectStoreNames.contains(name))
            q.result.createObjectStore(name, { keyPath: 'key' });
      };
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
      q.onblocked = () => reject(Error('Local library unavailable'));
    });
    const row = await new Promise<any>((resolve, reject) => {
      const q = db!
        .transaction('audio', 'readonly')
        .objectStore('audio')
        .get(key);
      q.onsuccess = () => resolve(q.result ?? null);
      q.onerror = () => reject(q.error);
    });
    if (!row) {
      self.postMessage({ ok: true, asset: null });
      return;
    }
    if (
      !(row.bytes instanceof ArrayBuffer) ||
      row.bytes.byteLength > AUDIO_MAX_BYTES ||
      typeof row.title !== 'string' ||
      row.title.length > 300 ||
      (row.jobId !== undefined && typeof row.jobId !== 'string')
    )
      throw Error('Invalid local audio');
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', row.bytes)),
      (x) => x.toString(16).padStart(2, '0'),
    ).join('');
    if (hash !== audioSha256) throw Error('Saved audio integrity failed');
    const p = inspectWav(row.bytes);
    if (p.sampleRate !== sampleRate || p.frames !== frames)
      throw Error('Saved audio format changed');
    self.postMessage({ ok: true, asset: row }, { transfer: [row.bytes] });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error) });
  } finally {
    db?.close();
  }
};
