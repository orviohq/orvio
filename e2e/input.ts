import type { Page } from '@playwright/test';
// Schedule a DOM keyboard event inside the page, avoiding remote automation RTT.
// Use the live input clock, not the last animation-frame timestamp: a slow
// render frame must not make a scheduled test key arrive after its target.
// Real OS-style keyboard transport remains covered by the full play/menu tests.
export async function atKey(
  page: Page,
  at: number,
  code: string,
  down: boolean,
) {
  return await page.evaluate(
    ({ at, code, down }) =>
      new Promise<{
        target: number;
        observed: number;
        latenessMs: number;
        dispatchPerformanceMs: number;
      }>((resolve) => {
        const tick = () => {
          if ((window as any).orvioDiagnostics.clock < at) {
            setTimeout(tick, 1);
            return;
          }
          const observed = (window as any).orvioDiagnostics.clock;
          const dispatchPerformanceMs = performance.now();
          window.dispatchEvent(
            new KeyboardEvent(down ? 'keydown' : 'keyup', {
              code,
              bubbles: true,
            }),
          );
          resolve({
            target: at,
            observed,
            latenessMs: (observed - at) * 1000,
            dispatchPerformanceMs,
          });
        };
        tick();
      }),
    { at, code: code === 'Space' ? 'Space' : 'Key' + code.toUpperCase(), down },
  );
}
