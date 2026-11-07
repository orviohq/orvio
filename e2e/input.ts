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
  await page.evaluate(
    ({ at, code, down }) =>
      new Promise<void>((resolve) => {
        const tick = () => {
          if ((window as any).orvioDiagnostics.clock < at) {
            setTimeout(tick, 1);
            return;
          }
          window.dispatchEvent(
            new KeyboardEvent(down ? 'keydown' : 'keyup', {
              code,
              bubbles: true,
            }),
          );
          resolve();
        };
        tick();
      }),
    { at, code: code === 'Space' ? 'Space' : 'Key' + code.toUpperCase(), down },
  );
}
