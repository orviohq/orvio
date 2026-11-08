import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test('moving long hold is spatially faded before, through and after keydown', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { Playfield } = await import(
      /* @vite-ignore */ String('/src/renderer.ts')
    );
    const { Engine } = await import(
      /* @vite-ignore */ String('/src/engine.ts')
    );
    document.body.innerHTML =
      '<div id="fixture" style="width:400px;height:800px;position:absolute;left:0;top:0"></div>';
    const field = new Playfield();
    await field.init(document.querySelector('#fixture')!);
    const engine = new Engine([{ id: 0, lane: 2, time: 2, end: 5 }]);
    field.setup(engine, 5, 0x29d8ff);
    (window as any).fixture = { field, engine };
  });
  for (const fader of ['out', 'out2', 'in', 'in2', 'off']) {
    const frames = [];
    for (const time of [1.0, 1.7, 1.99, 2, 2.01, 2.4, 3, 3.5, 4, 4.5, 4.9]) {
      const value = await page.evaluate(
        ({ fader, time }) => {
          const { field, engine } = (window as any).fixture;
          field.fader = fader;
          const s = engine.states[0];
          s.head = time >= 2 ? 100 : undefined;
          s.held = time >= 2;
          s.done = false;
          // Independent sampled render times avoid a synthetic-clock discontinuity.
          field.visualClock.reset();
          field.draw(engine, 5, time, 3, time * 1000);
          return {
            time,
            bodyAlpha: field.noteSprites[0].body.alpha,
            bodyY: field.noteSprites[0].body.y,
            bodyHeight: field.noteSprites[0].body.height,
            headY: field.noteSprites[0].head.y,
          };
        },
        { fader, time },
      );
      frames.push(value);
      await page
        .locator('#fixture canvas')
        .screenshot({ path: `test-results/spatial-${fader}-${time}.png` });
    }
    expect(frames.every((x) => x.bodyAlpha === 0.36)).toBe(true);
    fs.writeFileSync(
      test.info().outputPath(`frames-${fader}.json`),
      JSON.stringify(frames),
    );
    await test.info().attach(`frames-${fader}`, {
      body: JSON.stringify(frames),
      contentType: 'application/json',
    });
  }
  await page.evaluate(() => {
    (window as any).fixture.field.dispose();
  });
});
