import WorkerUrl from './local-audio.worker.ts?worker&url';
export async function readLocalAudioOwned(
  identity: {
    key: string;
    audioSha256: string;
    sampleRate: number;
    frames: number;
  },
  signal?: AbortSignal,
): Promise<any> {
  signal?.throwIfAborted();
  const worker = new Worker(WorkerUrl, { type: 'module' });
  try {
    return await new Promise((resolve, reject) => {
      const abort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abort, { once: true });
      const cleanup = () => signal?.removeEventListener('abort', abort);
      worker.onmessage = ({ data }) => {
        cleanup();
        if (data?.ok) resolve(data.asset);
        else reject(Error(data?.error || 'Saved audio verification failed'));
      };
      worker.onerror = (error) => {
        cleanup();
        reject(Error(error.message || 'Saved audio verification failed'));
      };
      try {
        worker.postMessage(identity);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  } finally {
    worker.terminate();
  }
}
