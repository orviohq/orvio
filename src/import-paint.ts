/** Allow the pending row to paint without trapping the admission queue when
 * animation frames are paused in a hidden/suspended page. */
export function waitImportPaint(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let first: number | undefined, second: number | undefined;
    const clean = () => {
      signal.removeEventListener('abort', abort);
      if (first !== undefined) globalThis.cancelAnimationFrame?.(first);
      if (second !== undefined) globalThis.cancelAnimationFrame?.(second);
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      clean();
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    first = requestAnimationFrame(() => {
      if (settled) return;
      second = requestAnimationFrame(() => {
        if (settled) return;
        settled = true;
        clean();
        resolve();
      });
    });
  });
}
