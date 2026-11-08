import { test, expect } from '@playwright/test';
test('constant CSS-pixel scroll and actual first-entry countdown across viewports', async ({
  page,
}, info) => {
  const samples = [];
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [320, 568],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/select/');
    const sample = await page.evaluate(async () => {
      const { Playfield } = await import(
        /* @vite-ignore */ String('/src/renderer.ts')
      );
      const { Engine } = await import(
        /* @vite-ignore */ String('/src/engine.ts')
      );
      const { startupCountdownTiming } = await import(
        /* @vite-ignore */ String('/src/timing.ts')
      );
      document.body.innerHTML =
        '<div id="scroll-probe" style="position:fixed;inset:0;background:#070f19"></div>';
      const host = document.querySelector('#scroll-probe') as HTMLElement;
      const f = new Playfield();
      await f.init(host);
      f.reducedMotion = true;
      const engine = new Engine([{ id: 0, lane: 2, time: 3 }]);
      f.setup(engine, 5, 0x29d8ff);
      f.draw(engine, 5, 2.85, 2 / 4.5, 1000);
      const first = (f as any).noteSprites[0].head.y;
      f.draw(engine, 5, 2.95, 2 / 4.5, 1100);
      const second = (f as any).noteSprites[0].head.y;
      const cd = startupCountdownTiming(120, 0, f.startupTravel);
      return {
        height: f.height,
        width: f.width,
        first,
        second,
        movement: second - first,
        cd,
        travel: f.startupTravel,
      };
    });
    expect(sample.movement).toBeCloseTo(118.8, 5);
    await page.screenshot({
      path: info.outputPath(`scroll-${width}x${height}.png`),
    });
    samples.push(sample);
  }
  console.log('SCROLL_GEOMETRY', JSON.stringify(samples));
});
