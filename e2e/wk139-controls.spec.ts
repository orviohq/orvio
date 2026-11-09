import { test, expect } from '@playwright/test';
const route =
  '/result/#v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1';
async function diff(page: any, a: Buffer, b: Buffer) {
  return page.evaluate(
    async (images: string[]) => {
      const data = await Promise.all(
        images.map(async (v) => {
          const im = await createImageBitmap(
            await (await fetch('data:image/png;base64,' + v)).blob(),
          );
          const c = document.createElement('canvas');
          c.width = im.width;
          c.height = im.height;
          const x = c.getContext('2d')!;
          x.drawImage(im, 0, 0);
          return {
            w: im.width,
            h: im.height,
            p: x.getImageData(0, 0, c.width, c.height).data,
          };
        }),
      );
      let changed = 0,
        max = 0;
      for (let i = 0; i < data[0].p.length; i += 4) {
        let d = false;
        for (let k = 0; k < 4; k++) {
          const v = Math.abs(data[0].p[i + k] - data[1].p[i + k]);
          d ||= !!v;
          max = Math.max(max, v);
        }
        changed += Number(d);
      }
      return {
        same: data[0].w === data[1].w && data[0].h === data[1].h,
        changed,
        max,
      };
    },
    [a.toString('base64'), b.toString('base64')],
  );
}
test('unmodified raw gate rejects changed count and border, hidden report releases hints', async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  let layers: any[] = [];
  cdp.on('LayerTree.layerTreeDidChange', (e: any) => (layers = e.layers || []));
  await cdp.send('LayerTree.enable');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);
  await expect(page.locator('#results')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const r = page.locator('#results');
  const a = await r.screenshot();
  await page
    .locator('#result-combo')
    .evaluate((e) => (e.textContent = '987654'));
  const count = await diff(page, a, await r.screenshot());
  expect(count.changed).toBeGreaterThan(1);
  expect(count.max).toBeGreaterThan(4);
  await page.locator('#result-combo').evaluate((e) => (e.textContent = '1'));
  await page
    .locator('.result-rank-block')
    .evaluate((e: HTMLElement) => (e.style.borderColor = '#ff0000'));
  const border = await diff(page, a, await r.screenshot());
  expect(border.changed).toBeGreaterThan(1);
  expect(border.max).toBeGreaterThan(4);
  await page
    .locator('.result-rank-block')
    .evaluate((e: HTMLElement) => e.style.removeProperty('border-color'));
  await page.waitForTimeout(100);
  const openLayers = [];
  for (const l of layers) {
    const reasons = await cdp
      .send('LayerTree.compositingReasons', { layerId: l.layerId })
      .catch(() => ({ compositingReasons: [] }));
    if (
      reasons.compositingReasons.some((s: string) => s.includes('will-change'))
    )
      openLayers.push({
        width: l.width,
        height: l.height,
        reasons: reasons.compositingReasons,
      });
  }
  console.log('VISIBLE_HINT_LAYERS', openLayers);
  const open = await page
    .locator('#result-rank')
    .evaluate((e) => getComputedStyle(e).willChange);
  await page.keyboard.press('Escape');
  await expect(r).toBeHidden();
  const hidden = await page
    .locator('#result-rank')
    .evaluate((e) => getComputedStyle(e).willChange);
  expect(open).toBe('transform, opacity');
  expect(hidden).toBe('auto');
  await page.waitForTimeout(100);
  console.log('HIDDEN_LAYER_COUNT', layers.length);
  console.log('NEGATIVE_AND_HINTS', { count, border, open, hidden });
});
