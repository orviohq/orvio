import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test.beforeAll(() =>
  fs.copyFileSync(
    'e2e/fixtures/renderer-v032.fixture.txt',
    'src/renderer-baseline-probe.ts',
  ),
);
test.afterAll(() =>
  fs.rmSync('src/renderer-baseline-probe.ts', { force: true }),
);
test('default skin preserves actual renderer pixels against v032 across holds and flashes', async ({
  page,
}, info) => {
  await page.goto('/select/');
  const results = await page.evaluate(async () => {
    const { Playfield: Before } = await import(
      /*@vite-ignore*/ String('/src/renderer-baseline-probe.ts')
    );
    const { Playfield: After } = await import(
      /*@vite-ignore*/ String('/src/renderer.ts')
    );
    const { Engine } = await import(/*@vite-ignore*/ String('/src/engine.ts'));
    document.body.innerHTML =
      '<div id="left" style="position:fixed;left:0;top:0;width:420px;height:620px"></div><div id="right" style="position:fixed;left:430px;top:0;width:420px;height:620px"></div>';
    const old = new Before(),
      next = new After();
    await old.init(document.querySelector('#left') as HTMLElement);
    await next.init(document.querySelector('#right') as HTMLElement);
    const notes = [
      { id: 0, lane: 0, time: 2 },
      { id: 1, lane: 2, time: 2.2, end: 3 },
      { id: 2, lane: 4, time: 3.2 },
    ];
    const out = [];
    for (const t of [1.8, 2.25, 2.6, 3.05]) {
      const a = new Engine(structuredClone(notes)),
        b = new Engine(structuredClone(notes));
      for (const engine of [a, b]) engine.states[1].held = t >= 2.2 && t < 3;
      old.setup(a, 5, 0x29d8ff);
      next.setup(b, 5, 0x29d8ff);
      old.reducedMotion = false;
      next.reducedMotion = false;
      for (const f of [old, next]) {
        f.pressed.add(2);
        f.flashes.set(2, { at: 950, ok: true });
      }
      old.draw(a, 5, t, 2 / 4.5, 1000);
      next.draw(b, 5, t, 2 / 4.5, 1000);
      const x = old.app.renderer.extract.pixels({
          target: old.app.stage,
        }).pixels,
        y = next.app.renderer.extract.pixels({ target: next.app.stage }).pixels;
      let diff = 0;
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) diff++;
      out.push({ t, bytes: x.length, diff });
    }
    return out;
  });
  console.log('SKIN_PIXEL_PARITY', JSON.stringify(results));
  expect(results.every((x) => x.bytes > 0 && x.diff === 0)).toBe(true);
  await page.screenshot({ path: info.outputPath('default-skin-pair.png') });
});
