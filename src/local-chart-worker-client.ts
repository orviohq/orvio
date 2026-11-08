import ChartWorker from './local-chart.worker?worker';
import type { SourceRecord } from './external-source';
export interface LocalChartOutput {
  bytes: ArrayBuffer;
  record: SourceRecord;
  baseRecordSha256: string;
}
export interface LocalChartInput {
  bytes: ArrayBuffer;
  videoId: string;
  audioSha256: string;
  signal?: AbortSignal;
}
/** Takes OWNERSHIP of bytes. On success returns the SAME transferred WAV allocation.
 * On cancellation the detached allocation may be lost. Caller must already have
 * a verified persistent audio cache or a permitted GET recovery path. Never pass
 * the sole uncached catalog/playback buffer; do not slice() to hide ownership. */
export async function prepareLocalChartOwned({
  bytes,
  videoId,
  audioSha256,
  signal,
}: LocalChartInput): Promise<LocalChartOutput> {
  signal?.throwIfAborted();
  const worker = new ChartWorker();
  try {
    return await new Promise<LocalChartOutput>((resolve, reject) => {
      const abort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      const cleanup = () => signal?.removeEventListener('abort', abort);
      signal?.addEventListener('abort', abort, { once: true });
      worker.onmessage = (e) => {
        cleanup();
        if (e.data?.ok) resolve(e.data);
        else {
          const error = new Error(e.data?.error ?? 'worker_failed');
          Object.assign(error, { returnedBytes: e.data?.bytes });
          reject(error);
        }
      };
      worker.onerror = (e) => {
        cleanup();
        reject(new Error(e.message || 'worker_failed'));
      };
      worker.postMessage({ id: 1, bytes, videoId, audioSha256 }, [bytes]);
    });
  } finally {
    worker.terminate();
  }
}
