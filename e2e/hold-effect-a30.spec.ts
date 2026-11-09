import { heldBindingCodes } from './hold-input';
import { test, expect } from '@playwright/test';
test('A30 integrated real-clock held effects persist and stop on release, then replay', async ({
  page,
}, testInfo) => {
  test.setTimeout(75000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/play/first-light/5/low/');
  await page.evaluate(async () => {
    const { Playfield } = await import(
      /* @vite-ignore */ String('/src/renderer.ts')
    );
    const draw = Playfield.prototype.draw;
    Playfield.prototype.draw = function (...args: any[]) {
      const begin = performance.now();
      const value = draw.apply(this, args);
      (window as any).__holdfx = {
        beams: this.hitBeams.map((b: any) => ({
          visible: b.visible,
          alpha: b.alpha,
        })),
        sparks: this.hitSparks.map(
          (ss: any[]) => ss.filter((s) => s.visible).length,
        ),
        cpu: performance.now() - begin,
      };
      return value;
    };
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  const note = await page.evaluate(
    () =>
      (window as any).orvioDiagnostics.notes.find((s: any) => s.note.end).note,
  );
  const keys = await heldBindingCodes(page);
  await page.evaluate(
    ({ n, keys }) => {
      const schedule = (time: number, down: boolean) => {
        const tick = () => {
          if ((window as any).orvioAudioTime < time) {
            setTimeout(tick, 1);
            return;
          }
          window.dispatchEvent(
            new KeyboardEvent(down ? 'keydown' : 'keyup', {
              code: keys[n.lane],
              bubbles: true,
            }),
          );
        };
        tick();
      };
      schedule(n.time, true);
      schedule(n.end, false);
    },
    { n: note, keys },
  );
  await page.waitForFunction(
    (n) => (window as any).orvioAudioTime >= n.time + 0.35,
    note,
    { polling: 10 },
  );
  const held = await page.evaluate(
    (n) => ({
      clock: (window as any).orvioAudioTime,
      state: (window as any).orvioDiagnostics.notes.find(
        (s: any) => s.note.id === n.id,
      ),
      fx: (window as any).__holdfx,
    }),
    note,
  );
  expect(held.state.held).toBe(true);
  expect(held.state.done).toBe(false);
  expect(held.fx.beams[note.lane].visible).toBe(true);
  expect(held.fx.sparks[note.lane]).toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath('a30-integrated-live-held.png'),
  });
  await page.waitForFunction(
    (n) => (window as any).orvioAudioTime >= n.end + 0.3,
    note,
    { polling: 10 },
  );
  const released = await page.evaluate(
    (n) => ({
      state: (window as any).orvioDiagnostics.notes.find(
        (s: any) => s.note.id === n.id,
      ),
      fx: (window as any).__holdfx,
    }),
    note,
  );
  expect(released.state.done).toBe(true);
  expect(released.fx.beams[note.lane].visible).toBe(false);
  expect(released.fx.sparks[note.lane]).toBe(0);
  await page.screenshot({
    path: testInfo.outputPath('a30-integrated-released.png'),
  });
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  await page.click('#watch-replay');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.replayActive),
  );
  await page.waitForFunction(() => (window as any).orvioAudioTime < 1);
  await page.waitForFunction(
    (n) => (window as any).orvioAudioTime >= n.time + 0.35,
    note,
    { polling: 10 },
  );
  const replay = await page.evaluate(
    (n) => ({
      state: (window as any).orvioDiagnostics.notes.find(
        (s: any) => s.note.id === n.id,
      ),
      fx: (window as any).__holdfx,
    }),
    note,
  );
  expect(replay.state.held).toBe(true);
  expect(replay.fx.beams[note.lane].visible).toBe(true);
  expect(replay.fx.sparks[note.lane]).toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath('a30-integrated-replay-held.png'),
  });
  await page.waitForFunction(
    (n) => (window as any).orvioAudioTime >= n.end + 0.3,
    note,
    { polling: 10 },
  );
  expect(
    await page.evaluate((n) => (window as any).__holdfx.sparks[n.lane], note),
  ).toBe(0);
  expect(errors).toEqual([]);
  console.log(
    'ACTUAL_A30',
    JSON.stringify({
      note,
      held: { clock: held.clock, cpu: held.fx.cpu },
      releaseStopped: true,
      replayHeld: true,
      replayReleaseStopped: true,
      errors,
    }),
  );
});
test('A30 integrated renderer simultaneous lanes reduced-motion and bounded draw cost', async ({
  page,
}, testInfo) => {
  await page.goto('/select/');
  const result = await page.evaluate(async () => {
    const { Playfield } = await import(
      /* @vite-ignore */ String('/src/renderer.ts')
    );
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;inset:0 auto auto 0;width:440px;height:620px;z-index:9999;background:#070d15';
    document.body.append(host);
    const pf = new Playfield();
    await pf.init(host);
    const engine = {
      combo: 1,
      states: [1, 3].map((lane) => ({
        note: { id: lane, lane, time: 1, end: 4 },
        held: true,
        done: false,
      })),
    };
    pf.setup(engine, 5, 0x29d8ff);
    pf.draw(engine, 5, 2, 1.33, 10000);
    const held = pf.hitBeams.map((s: any) => s.visible);
    const loops = pf.hitSparks.map(
      (ss: any[]) => ss.filter((s) => s.visible).length,
    );
    pf.reducedMotion = true;
    pf.draw(engine, 5, 2, 1.33, 10010);
    const reduced = pf.hitSparks.flat().filter((s: any) => s.visible).length;
    pf.reducedMotion = false;
    const timings: number[] = [];
    for (let i = 0; i < 300; i++) {
      const t = performance.now();
      pf.draw(engine, 5, 2, 1.33, 10000 + i);
      timings.push(performance.now() - t);
    }
    timings.sort((a, b) => a - b);
    (window as any).__a30stub = { pf, engine };
    return {
      held,
      loops,
      reduced,
      cpuMedian: timings[150],
      cpuP95: timings[285],
    };
  });
  expect(result.held).toEqual([false, true, false, true, false]);
  expect(result.loops).toEqual([0, 6, 0, 6, 0]);
  expect(result.reduced).toBe(0);
  await page.screenshot({
    path: testInfo.outputPath('a30-integrated-multilane-stub.png'),
  });
  console.log('A30_STUB_COST', JSON.stringify(result));
});
