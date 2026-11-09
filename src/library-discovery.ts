import WorkerUrl from './library-discovery.worker.ts?worker&url';
export function discoverLibrary<T>(
  kind: 'opus' | 'legacy',
  onVerified?: (row: T) => void,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WorkerUrl, { type: 'module' }),
      rows: T[] = [];
    const fail = () => {
      worker.terminate();
      reject(Error('Saved chart integrity failed'));
    };
    worker.onerror = fail;
    worker.onmessage = ({ data }) => {
      if (data?.kind === 'row') {
        try {
          const row = JSON.parse(
            new TextDecoder('utf-8', { fatal: true }).decode(data.bytes),
          );
          rows.push(row);
          onVerified?.(row);
        } catch {
          fail();
        }
      } else if (data?.kind === 'done') {
        worker.terminate();
        resolve(rows);
      } else fail();
    };
    worker.postMessage(kind);
  });
}
