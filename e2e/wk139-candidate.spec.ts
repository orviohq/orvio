// WK139 trimmed repro: finished-vs-reopened raw parity captures only.
// Same calls as the gate spec (gameplay -> capture -> reload -> capture -> compare),
// minus share/toast/retry/navigation assertions. ~65s.
// A sub-10s repro needs a product-side seed hook: builtin sessions live in
// IndexedDB orvio.builtin-replays.v1 (store 'sessions'), so localStorage seeding
// alone cannot restore /result/?local=builtin:<key>. See README.
import { writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

for (const mode of ['desktop', 'mobile', 'reduced'] as const)
  test(
    'finished vs reopened raw parity captures ' + mode,
    async ({ page }, testInfo) => {
      test.setTimeout(100000);
      if (mode === 'mobile')
        await page.setViewportSize({ width: 390, height: 844 });
      if (mode === 'reduced')
        await page.emulateMedia({ reducedMotion: 'reduce' });
      async function readyResult() {
        await page.evaluate(async () => {
          const result = document.querySelector('#results')!;
          const deadline = performance.now() + 4000;
          while (true) {
            if (performance.now() > deadline)
              throw Error('Result intro did not settle within 4 seconds');
            const active = result
              .getAnimations({ subtree: true })
              .filter((a) => a.pending || a.playState === 'running');
            if (!active.length) break;
            await Promise.race([
              Promise.all(active.map((a) => a.finished)),
              new Promise((_, reject) =>
                setTimeout(() => reject(Error('Result intro stuck')), 4000),
              ),
            ]);
          }
          await document.fonts.ready;
          await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          );
        });
      }
      async function compare(aB64: string, bB64: string) {
        return page.evaluate(
          async (images) => {
            const frames = await Promise.all(
              images.map(async (base) => {
                const blob = await (
                  await fetch('data:image/png;base64,' + base)
                ).blob();
                const image = await createImageBitmap(blob);
                const c = document.createElement('canvas');
                c.width = image.width;
                c.height = image.height;
                const ctx = c.getContext('2d')!;
                ctx.drawImage(image, 0, 0);
                return {
                  width: c.width,
                  height: c.height,
                  pixels: ctx.getImageData(0, 0, c.width, c.height).data,
                };
              }),
            );
            const [a, b] = frames;
            let changed = 0,
              maxChannel = 0;
            if (a.width !== b.width || a.height !== b.height)
              return {
                sameSize: false,
                changed: Infinity,
                maxChannel: Infinity,
              };
            for (let i = 0; i < a.pixels.length; i += 4) {
              let diff = false;
              for (let c = 0; c < 4; c++) {
                const d = Math.abs(a.pixels[i + c] - b.pixels[i + c]);
                if (d) diff = true;
                maxChannel = Math.max(maxChannel, d);
              }
              if (diff) changed++;
            }
            return { sameSize: true, changed, maxChannel };
          },
          [aB64, bB64],
        );
      }
      await page.goto('/play/first-light/5/low/');
      await page.keyboard.press('Enter');
      await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
      await expect(page.locator('#result-fever')).toContainText('FEVER MAX 0');
      await readyResult();
      const original = await page
        .locator('#results')
        .screenshot({ path: testInfo.outputPath('result-original-raw.png') });
      await page.reload();
      await expect(page.locator('#results')).toBeVisible();
      await readyResult();
      const reopened = await page
        .locator('#results')
        .screenshot({ path: testInfo.outputPath('result-reopened-raw.png') });
      const comparison = await compare(
        original.toString('base64'),
        reopened.toString('base64'),
      );
      await writeFile(
        testInfo.outputPath('result-raw-comparison.json'),
        JSON.stringify(comparison),
      );
      console.log('RAW', comparison);
      expect(comparison.sameSize).toBe(true);
      expect(comparison.changed).toBeLessThanOrEqual(1);
      expect(comparison.maxChannel).toBeLessThanOrEqual(4);
    },
  );
