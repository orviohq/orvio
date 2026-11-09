import WorkerUrl from './library-metadata.worker.ts?worker&url';
let worker: Worker | undefined;
let sequence = 0;
const pending = new Map<number, { resolve: () => void; reject: () => void }>();
export function updateLegacyDisplayMetadata(
  audioKey: string,
  metadataKey: string,
  title: string,
  author: string | null,
): Promise<void> {
  if (!worker) {
    const owned = new Worker(WorkerUrl, { type: 'module' });
    worker = owned;
    owned.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      if (data.ok) request.resolve();
      else request.reject();
    };
    owned.onerror = () => {
      if (worker !== owned) return;
      owned.terminate();
      worker = undefined;
      for (const request of pending.values()) request.reject();
      pending.clear();
    };
  }
  const id = ++sequence;
  return new Promise<void>((resolve, reject) => {
    pending.set(id, {
      resolve,
      reject: () => reject(Error('Display metadata save failed')),
    });
    try {
      worker!.postMessage({ id, audioKey, metadataKey, title, author });
    } catch {
      pending.delete(id);
      reject(Error('Display metadata save failed'));
    }
  });
}
