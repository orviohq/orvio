// Optional display writes own raw audio clones here, never on the input thread.
// Source keys/bytes, session data and every chart/hash remain untouched.
let database: Promise<IDBDatabase> | undefined;
function open() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const q = indexedDB.open('orvio.external-library.v1', 2);
    q.onupgradeneeded = () => {
      for (const name of ['audio', 'sessions', 'metadata'])
        if (!q.result.objectStoreNames.contains(name))
          q.result.createObjectStore(name, { keyPath: 'key' });
    };
    q.onsuccess = () => {
      q.result.onversionchange = () => {
        q.result.close();
        database = undefined;
      };
      resolve(q.result);
    };
    q.onerror = () => {
      database = undefined;
      reject(q.error);
    };
    q.onblocked = () => {
      database = undefined;
      reject(Error('Local library unavailable'));
    };
  }));
}
self.onmessage = async ({ data }) => {
  const { id, audioKey, metadataKey, title, author } = data;
  try {
    if (
      !Number.isSafeInteger(id) ||
      typeof audioKey !== 'string' ||
      typeof metadataKey !== 'string' ||
      typeof title !== 'string' ||
      title.length > 300 ||
      (author !== null && (typeof author !== 'string' || author.length > 200))
    )
      throw Error('Invalid display metadata');
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['audio', 'metadata'], 'readwrite');
      for (const [store, key] of [
        ['audio', audioKey],
        ['metadata', metadataKey],
      ]) {
        const target = tx.objectStore(store),
          q = target.get(key);
        q.onsuccess = () => {
          const row = q.result;
          if (
            row &&
            (row.title !== title || (author !== null && row.author !== author))
          )
            target.put({
              ...row,
              title,
              ...(author !== null ? { author } : {}),
            });
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    self.postMessage({ id, ok: true });
  } catch {
    self.postMessage({ id, ok: false });
  }
};
