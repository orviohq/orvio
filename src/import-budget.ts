import { AudioJobError } from './external-audio-api';
import type { ImportStage } from './import-progress';

/**
 * Uses a bounded acquisition window (90 seconds by default, optionally 195),
 * followed by independent 30-, 60-, and 15-second completion windows.
 * The total budget is 195 seconds by default or 300 seconds when requested.
 */
export function createImportBudget(acquisitionMs: 90000 | 195000 = 90000) {
  const controller = new AbortController();
  let phase = 0;
  let timer: ReturnType<typeof setTimeout>;
  const expire = () =>
    controller.abort(
      new AudioJobError(
        'request_timeout',
        undefined,
        undefined,
        undefined,
        phase === 1
          ? 'response'
          : phase === 2
            ? 'analysis'
            : phase === 3
              ? 'storage'
              : undefined,
      ),
    );
  const arm = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(expire, ms);
  };
  arm(acquisitionMs);
  // Defense against callback bugs: even valid forward phases cannot run forever.
  const total = setTimeout(expire, acquisitionMs + 30000 + 60000 + 15000);
  return {
    signal: controller.signal,
    verified() {
      if (controller.signal.aborted || phase !== 0) return;
      phase = 1;
      arm(30000);
    },
    stage(stage: ImportStage) {
      if (controller.signal.aborted) return;
      if (phase === 1 && stage === 'charting') {
        phase = 2;
        arm(60000);
      } else if (phase === 2 && stage === 'saving') {
        phase = 3;
        arm(15000);
      }
    },
    dispose() {
      clearTimeout(timer);
      clearTimeout(total);
    },
  };
}
