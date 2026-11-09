import { AudioJobError } from './external-audio-api';
import type { ImportStage } from './import-progress';

/** Only a durably saved, verified v2 receipt earns completion budgets.
 * Acquisition remains capped at 90s. Repeated/out-of-order progress cannot
 * renew a budget. No retry or network operation is performed here. */
export function createImportBudget() {
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
  arm(90000);
  // Defense against callback bugs: even valid forward phases cannot run forever.
  const total = setTimeout(expire, 195000);
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
