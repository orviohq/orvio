import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test('out-fader long bodies have a stationary gradient, not a keydown flash or hard edge', async ({
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
  const evidence = [];
  for (const [width, height] of [
    [400, 800],
    [710, 520],
    [390, 844],
  ])
    for (const lanes of [5, 7])
      for (const travel of [0.4, 1.5, 3])
        for (const fader of ['out', 'out2']) {
          const images = [];
          for (const held of [false, true]) {
            const meta = await page.evaluate(
              ({ width, height, lanes, travel, fader, held }) => {
                const { field, engine } = (window as any).fixture;
                field.hostWidth = width;
                field.hostHeight = height;
                field.fader = fader;
                field.setup(engine, lanes, 0x29d8ff);
                const s = engine.states[0];
                s.held = held;
                s.head = held ? 100 : undefined;
                s.done = false;
                field.visualClock.reset();
                field.draw(
                  engine,
                  lanes,
                  held ? 2 : 1.99,
                  travel,
                  performance.now(),
                );
                return {
                  target: field.height - 92,
                  width: field.width,
                  height: field.height,
                };
              },
              { width, height, lanes, travel, fader, held },
            );
            const png = await page.locator('#fixture canvas').screenshot();
            const profile = await page.evaluate(
              async ({ png, meta, lanes, fader }) => {
                const img = await createImageBitmap(
                  await (await fetch('data:image/png;base64,' + png)).blob(),
                );
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                const x = Math.floor((2.5 * meta.width) / lanes);
                const edge = fader === 'out' ? 2 / 3 : 0.5;
                const ys = [
                  edge - 0.06,
                  edge - 0.03,
                  edge,
                  edge + 0.03,
                  edge + 0.06,
                ].map((y) => Math.round(meta.target * y));
                return ys.map((y) =>
                  Array.from(ctx.getImageData(x, y, 1, 1).data),
                );
              },
              { png: png.toString('base64'), meta, lanes, fader },
            );
            images.push(profile);
          }
          expect(images[0]).toEqual(images[1]);
          const blue = images[0].map((x) => x[2]);
          expect(blue[0]).toBeGreaterThan(blue[1]);
          expect(blue[1]).toBeGreaterThan(blue[2]);
          expect(blue[2]).toBeGreaterThan(blue[3]);
          expect(blue[3]).toBeGreaterThan(blue[4]);
          expect(blue[0] - blue[4]).toBeGreaterThan(50);
          evidence.push({
            width,
            height,
            lanes,
            travel,
            fader,
            before: images[0],
            held: images[1],
          });
        }
  fs.writeFileSync(
    test.info().outputPath('actual-webgl-pixels.json'),
    JSON.stringify(evidence),
  );
  await test.info().attach('actual-webgl-pixels', {
    body: JSON.stringify(evidence),
    contentType: 'application/json',
  });
});

test('same Playfield detaches mask before replacing texture across every option and dispose', async ({
  page,
}) => {
  await page.goto('/');
  const evidence = await page.evaluate(async () => {
    const { Playfield } = await import(
      /* @vite-ignore */ String('/src/renderer.ts')
    );
    const { Engine } = await import(
      /* @vite-ignore */ String('/src/engine.ts')
    );
    document.body.innerHTML =
      '<div id="fixture" style="width:400px;height:800px"></div>';
    const field: any = new Playfield();
    await field.init(document.querySelector('#fixture')!);
    const engine = new Engine([{ id: 0, lane: 2, time: 2, end: 5 }]);
    field.setup(engine, 5, 0x29d8ff);
    const result = [];
    for (const fader of [
      'out',
      'off',
      'out2',
      'blink',
      'out',
      'blink2',
      'out2',
      'fog',
      'out',
      'pixel',
      'out2',
      'pixel2',
      'out',
      'blind',
      'out2',
      'in',
      'out',
      'in2',
      'out2',
      'off',
      'out',
    ]) {
      const previous = field.fadeMask.texture;
      const hadMask = !!field.notes.mask;
      field.fader = fader;
      field.visualClock.reset();
      field.draw(engine, 5, 2, 3, performance.now());
      const active = fader === 'out' || fader === 'out2';
      result.push({
        fader,
        active,
        hasMask: !!field.notes.mask,
        sameMask: field.notes.mask === field.fadeMask,
        previousDestroyed: previous.destroyed,
        hadMask,
        textureIsSame: previous === field.fadeMask.texture,
      });
    }
    // Document the actual Pixi API trap, then restore the safe detach explicitly.
    const installed = field.notes.mask;
    field.notes.setMask({ mask: null });
    const nullOptionsRetainsMask = field.notes.mask === installed;
    field.notes.mask = null;
    const explicitDetachWorks = !field.notes.mask;
    field.fader = 'out2';
    field.fadeMaskMode = 'off';
    field.draw(engine, 5, 2, 3, performance.now());
    const owned = field.fadeMask.texture;
    field.dispose();
    return {
      result,
      nullOptionsRetainsMask,
      explicitDetachWorks,
      disposeDestroyedOwned: owned.destroyed,
    };
  });
  expect(evidence.nullOptionsRetainsMask).toBe(true);
  expect(evidence.explicitDetachWorks).toBe(true);
  expect(evidence.disposeDestroyedOwned).toBe(true);
  for (const x of evidence.result) {
    expect(x.hasMask).toBe(x.active);
    if (x.active) expect(x.sameMask).toBe(true);
    if (x.hadMask) expect(x.previousDestroyed).toBe(true);
  }
  fs.writeFileSync(
    test.info().outputPath('same-instance-mask-transitions.json'),
    JSON.stringify(evidence),
  );
  await test.info().attach('same-instance-mask-transitions', {
    body: JSON.stringify(evidence),
    contentType: 'application/json',
  });
});
