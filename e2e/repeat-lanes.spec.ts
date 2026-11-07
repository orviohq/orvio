import { test, expect } from '@playwright/test';

test('physical custom keys stay on their pixel lane across repeated starts and 5/7/5 modes', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    const w = window as any;
    w.lostPlayfields = 0;
    w.createdPlayfields = 0;
    w.contexts = [];
    const get = HTMLCanvasElement.prototype.getContext;
    const seen = new WeakSet();
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: any[]
    ) {
      const result = (get as any).apply(this, args);
      if (
        result &&
        ['webgl', 'webgl2'].includes(args[0]) &&
        !seen.has(result)
      ) {
        seen.add(result);
        w.createdPlayfields++;
        w.contexts.push({ canvas: this, gl: result });
        this.addEventListener('webglcontextlost', () => w.lostPlayfields++);
      }
      return result;
    } as any;
  });
  await page.goto('/select/');
  // Isolate the canvas lane geometry from DOM judgment overlays. BREAK can
  // dim the whole clipped screenshot even while the actual key glow is right.
  // This does not change canvas drawing, input, chart times or judgments.
  await page.addStyleTag({
    content: '#impact, #judge, #combo { visibility: hidden !important; }',
  });
  await page.click('#open-settings');
  await page.click('[data-keymode="5"][data-slot="0"]');
  for (const key of ['n', 'm', ',', '.', '/']) await page.keyboard.press(key);
  await page.click('[data-keymode="7"][data-slot="0"]');
  for (const key of ['q', 'w', 'e', 'r', 't', 'y', 'u'])
    await page.keyboard.press(key);
  await page.locator('#settings .close').click();
  // Use the standard BLIND option to remove note heads and hold bodies from
  // this key-geometry measurement, without changing the renderer or chart.
  await page.keyboard.press('F3');
  await page.locator('.icon-options-fader [data-value=blind]').click();
  await page.keyboard.press('Escape');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const samples = [];
  for (const [round, lanes] of [5, 5, 7, 5].entries()) {
    await page.click(`[data-lanes="${lanes}"]`);
    const began = Date.now();
    await page.click('#start');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    const startupMs = Date.now() - began;
    await page.waitForFunction(() => (window as any).orvioAudioTime > 0.1);
    await expect(page.locator('#highway canvas')).toHaveCount(1);
    const keys =
      lanes === 5
        ? ['n', 'm', ',', '.', '/']
        : ['q', 'w', 'e', 'r', 't', 'y', 'u'];
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).orvioDiagnostics.metrics.effects.noteAlpha,
        ),
      )
      .toBe(0);
    for (const [lane, key] of keys.entries()) {
      await page.waitForTimeout(80);
      const before = await page.locator('#highway canvas').screenshot();
      await page.keyboard.down(key);
      await page.waitForTimeout(80);
      const held = await page.locator('#highway canvas').screenshot();
      expect(
        await page.evaluate(() => ({
          active: (window as any).orvioDiagnostics.active,
          paused: (window as any).orvioDiagnostics.paused,
          fader: (window as any).orvioDiagnostics.settings.fader,
          alpha: (window as any).orvioDiagnostics.metrics.effects.noteAlpha,
        })),
      ).toEqual({ active: true, paused: false, fader: 'blind', alpha: 0 });
      // Measure the change in the key glow, not absolute brightness. Exclude
      // the keycap overlay and use a median across the remaining tall region
      // so a moving 10px note head cannot masquerade as a held key.
      const changes = await page.evaluate(
        async ({ before, held, lanes }) => {
          const pixels = async (data: string) => {
            const image = new Image();
            image.src = 'data:image/png;base64,' + data;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(image, 0, 0);
            return {
              width: canvas.width,
              height: canvas.height,
              data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
            };
          };
          const a = await pixels(before),
            b = await pixels(held);
          return Array.from({ length: lanes }, (_, lane) => {
            const differences: number[] = [];
            const center = Math.floor(((lane + 0.5) * a.width) / lanes);
            for (let y = a.height - 86; y < a.height - 12; y++) {
              if (y >= a.height - 55 && y < a.height - 24) continue;
              for (let x = center - 3; x < center + 3; x++) {
                const i = (y * a.width + x) * 4 + 2;
                differences.push(b.data[i] - a.data[i]);
              }
            }
            differences.sort((a, b) => a - b);
            return differences[Math.floor(differences.length / 2)];
          });
        },
        {
          before: before.toString('base64'),
          held: held.toString('base64'),
          lanes,
        },
      );
      expect(
        changes.indexOf(Math.max(...changes)),
        `round ${round + 1} ${lanes}K ${key}: ${changes}`,
      ).toBe(lane);
      expect(changes[lane]).toBeGreaterThan(15);
      for (const [other, value] of changes.entries())
        if (other !== lane) expect(Math.abs(value)).toBeLessThan(10);
      samples.push({ round, lanes, key, lane, changes, startupMs });
      await page.keyboard.up(key);
    }
    await page.screenshot({
      path: `test-results/repeat-lanes-${round + 1}-${lanes}.png`,
    });
    if (round < 3) {
      await page.keyboard.press('Escape');
      await page.click('#pause-exit');
      await expect(page.locator('#lobby')).toBeVisible();
    }
  }
  const lifecycle = await page.evaluate(() =>
    (window as any).contexts
      .filter((x: any) => x.canvas.width > 0 && x.canvas.height > 0)
      .map((x: any) => ({
        connected: x.canvas.isConnected,
        lost: x.gl.isContextLost(),
      })),
  );
  expect(lifecycle.filter((x: any) => x.connected && !x.lost)).toHaveLength(1);
  expect(lifecycle.filter((x: any) => !x.connected && !x.lost)).toHaveLength(0);
  expect(lifecycle.filter((x: any) => x.lost)).toHaveLength(3);
  expect(errors).toEqual([]);
  console.log('repeat-key-pixels', JSON.stringify({ samples, lifecycle }));
});
