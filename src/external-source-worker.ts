import AnalysisWorker from './external-analysis-worker?worker';
import { generateSourceRecord } from './external-source-provider';
import {
  validSourceRecord,
  verifyChartHashes,
  type SourceRecord,
} from './external-source';
import { AudioJobError } from './external-audio-api';
/** New-import analysis only. Keep the original audio buffer intact for saving/playback. */
export async function generateSourceOffThread(
  bytes: ArrayBuffer,
  videoId: string,
  hash: string,
  signal?: AbortSignal,
): Promise<SourceRecord> {
  signal?.throwIfAborted();
  if (typeof Worker === 'undefined') {
    if (typeof window === 'undefined')
      return generateSourceRecord(bytes, videoId, hash);
    throw new AudioJobError('unavailable');
  }
  const worker = new AnalysisWorker();
  try {
    const record = await new Promise<SourceRecord>((resolve, reject) => {
      const abort = () => reject(new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', abort, { once: true });
      const done = () => signal?.removeEventListener('abort', abort);
      worker.onmessage = (event) => {
        done();
        if (event.data?.error || !validSourceRecord(event.data?.record)) {
          reject(new AudioJobError('unavailable'));
          return;
        }
        resolve(event.data.record);
      };
      worker.onerror = () => {
        done();
        reject(new AudioJobError('unavailable'));
      };
      // Exactly one bounded copy is transferred. Never detach the catalog's audio.
      const copy = bytes.slice(0);
      worker.postMessage({ bytes: copy, videoId, hash }, [copy]);
    });
    signal?.throwIfAborted();
    if (
      record.videoId !== videoId ||
      record.audioSha256 !== hash ||
      !(await verifyChartHashes(record))
    )
      throw new AudioJobError('integrity_failed');
    signal?.throwIfAborted();
    return record;
  } finally {
    worker.terminate();
  }
}
