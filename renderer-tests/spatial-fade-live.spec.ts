import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test.use({ video: 'on', viewport: { width: 900, height: 900 } });
for (const fader of ['out', 'out2'])
  test(`real-time keyboard hold ${fader}: no alpha jump and spatial fade persists`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(async (fader) => {
      const { Playfield } = await import(
        /* @vite-ignore */ String('/src/renderer.ts')
      );
      const { Engine } = await import(
        /* @vite-ignore */ String('/src/engine.ts')
      );
      document.body.innerHTML =
        '<div id="label" style="position:absolute;left:430px;top:0;color:white;font:24px monospace"></div><div id="fixture" style="width:400px;height:800px;position:absolute;left:0;top:0"></div>';
      const field = new Playfield();
      await field.init(document.querySelector('#fixture')!);
      field.fader = fader;
      const engine = new Engine([
        { id: 0, lane: 1, time: 2, end: 5 },
        { id: 1, lane: 2, time: 2, end: 5 },
        { id: 2, lane: 3, time: 2, end: 5 },
      ]);
      field.setup(engine, 5, 0x29d8ff);
      let time = 0,
        seq = 0;
      const start = performance.now();
      const samples: any[] = [];
      const input = (e: KeyboardEvent, down: boolean) => {
        const lane = e.code === 'KeyS' ? 1 : e.code === 'KeyF' ? 3 : -1;
        if (lane >= 0) {
          engine.input({ lane, time: 2, down, sequence: seq++ });
          if (down) field.pressed.add(lane);
          else field.pressed.delete(lane);
        }
      };
      document.addEventListener('keydown', (e) => input(e, true));
      document.addEventListener('keyup', (e) => input(e, false));
      (window as any).fixture = {
        field,
        engine,
        samples,
        get time() {
          return time;
        },
      };
      const frame = (now: number) => {
        time = (now - start) / 1000;
        engine.update(time);
        field.draw(engine, 5, time, 3, now);
        samples.push({
          time,
          alphas: field.noteSprites.map((v: any) => v.body.alpha),
          held: engine.states.map((s: any) => s.held),
          work: field.work.at(-1),
        });
        document.querySelector('#label')!.textContent =
          fader + ' t=' + time.toFixed(3) + '\nS held, middle missed';
        if (time < 5.4) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }, fader);
    await page.waitForFunction(() => (window as any).fixture.time >= 1.98);
    await page.keyboard.down('KeyS');
    await page.keyboard.down('KeyF');
    await page.waitForFunction(() => (window as any).fixture.time >= 2.5);
    await page.keyboard.up('KeyF');
    await page.waitForFunction(() => (window as any).fixture.time >= 4.9);
    await page.evaluate(() => {
      const { engine } = (window as any).fixture;
      engine.input({ lane: 1, time: 5, down: false, sequence: 9 });
    });
    await page.waitForFunction(() => (window as any).fixture.time >= 5.4);
    const result = await page.evaluate(() => {
      const { field, engine, samples } = (window as any).fixture;
      return {
        samples,
        score: engine.score,
        events: engine.events,
        perf: field.recentPerf(),
        states: engine.states,
      };
    });
    expect(result.events.map((x: any) => x.value)).toEqual([
      100, 100, 0, 0, 0, 100,
    ]);
    expect(
      result.samples.every((x: any) =>
        x.alphas.every((a: number) => a === 0.36 || a === 0.2),
      ),
    ).toBe(true);
    fs.writeFileSync(
      test.info().outputPath('moving-frames.json'),
      JSON.stringify(result),
    );
    await test.info().attach('moving-frames', {
      body: JSON.stringify(result),
      contentType: 'application/json',
    });
  });
