import { test, expect } from '@playwright/test';

test('physical custom keys stay on their pixel lane across repeated starts and 5/7/5 modes', async ({
  page,
}) => {
  test.setTimeout(60000);
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
  await page.click('#open-settings');
  await page.click('[data-keymode="5"][data-slot="0"]');
  for (const key of ['n', 'm', ',', '.', '/']) await page.keyboard.press(key);
  await page.click('[data-keymode="7"][data-slot="0"]');
  for (const key of ['q', 'w', 'e', 'r', 't', 'y', 'u'])
    await page.keyboard.press(key);
  await page.locator('#settings .close').click();
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
    for (const [lane, key] of keys.entries()) {
      await page.keyboard.down(key);
      await page.waitForTimeout(80);
      const png = await page.locator('#highway canvas').screenshot();
      const brightness = await page.evaluate(
        async ({ data, lanes }) => {
          const image = new Image();
          image.src = 'data:image/png;base64,' + data;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(image, 0, 0);
          return Array.from({ length: lanes }, (_, i) => {
            const pixels = ctx.getImageData(
              Math.floor(((i + 0.5) * canvas.width) / lanes) - 3,
              canvas.height - 55,
              6,
              12,
            ).data;
            let sum = 0;
            for (let p = 0; p < pixels.length; p += 4) sum += pixels[p + 2];
            return sum / (pixels.length / 4);
          });
        },
        { data: png.toString('base64'), lanes },
      );
      const brightest = brightness.indexOf(Math.max(...brightness));
      expect(
        brightest,
        `round ${round + 1} ${lanes}K ${key}: ${brightness}`,
      ).toBe(lane);
      expect(brightness[lane]).toBeGreaterThan(35);
      samples.push({ round, lanes, key, lane, brightness, startupMs });
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
