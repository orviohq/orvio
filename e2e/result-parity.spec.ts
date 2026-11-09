import { writeFile } from 'node:fs/promises';
import { mockShare } from './share-mock';
import { test, expect } from '@playwright/test';
test('finished and reopened result are the same view, copy works without a link field', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(85000);
  async function readyResult() {
    await page.evaluate(async () => {
      const report = document.querySelector('#results')!;
      const deadline = performance.now() + 4000;
      while (true) {
        if (performance.now() > deadline)
          throw Error('Result intro did not settle within 4 seconds');
        const active = report
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
      await Promise.all(
        Array.from(
          document.querySelectorAll<HTMLImageElement>('#results img'),
          (image) => image.decode(),
        ),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
  }
  async function layoutState() {
    return page.evaluate(() => ({
      dpr: devicePixelRatio,
      viewport: [innerWidth, innerHeight],
      focus: document.activeElement?.id,
      elements: Array.from(
        document.querySelectorAll<HTMLElement>('#results, #results *'),
        (element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName,
            id: element.id,
            classes: element.className,
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            font: style.font,
            opacity: style.opacity,
            transform: style.transform,
          };
        },
      ),
    }));
  }
  const shared = await mockShare(context);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  await expect(page.locator('#result-fever')).toContainText('FEVER MAX 0');
  // A fresh result address is cross-device shareable; archiving must not
  // silently replace it with a device-local pointer (Nov 7 address-bar copy).
  await page.waitForURL(
    (url) =>
      url.pathname === '/result/' &&
      new URLSearchParams(url.hash.slice(1)).has('r'),
  );
  const url = page.url();
  expect(url).toContain('/result/#v=4&');
  expect(new URL(url).searchParams.has('local')).toBe(false);
  const saved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = indexedDB.open('orvio.builtin-replays.v1', 1);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    try {
      const rows = await new Promise<any[]>((resolve, reject) => {
        const q = db
          .transaction('sessions', 'readonly')
          .objectStore('sessions')
          .getAll();
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
      });
      const saved = rows.find(
        (row) =>
          row.replay.song === 'first-light' &&
          row.replay.lanes === 5 &&
          row.replay.difficulty === 'low',
      );
      if (!saved) throw Error('Builtin replay was not archived');
      const { builtinShareFragment } = await import(
        /* @vite-ignore */ String('/src/builtin-share-fragment.ts')
      );
      if (
        (await builtinShareFragment(
          saved.replay,
          saved.result,
          saved.chart,
        )) !== location.hash.slice(1)
      )
        throw Error(
          'Fresh result address differs from exact archived result/replay',
        );
      return saved;
    } finally {
      db.close();
    }
  });
  expect(saved?.key).toMatch(/^builtin:[0-9a-f-]{36}$/);
  expect(saved?.kind).toBe('builtin');
  expect(saved?.replay?.song).toBe('first-light');
  expect(saved?.replay?.lanes).toBe(5);
  expect(saved?.replay?.difficulty).toBe('low');
  await expect(page.locator('#result-url,#share-privacy')).toHaveCount(0);
  await readyResult();
  const originalState = await layoutState();
  const original = await page
    .locator('#results')
    .screenshot({ path: testInfo.outputPath('result-original-raw.png') });
  await page.click('#share-result');
  await expect(page.locator('[data-sonner-toast]')).toHaveText(
    '링크를 복사했어요',
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '/result/?s=',
  );
  await expect(page.locator('#results [data-sonner-toast]')).toBeVisible();
  await expect(page.locator('[data-sonner-toast]')).toHaveText(
    '링크를 복사했어요',
  );
  await page.waitForFunction(
    () => !document.querySelector('[data-sonner-toast][data-removed="false"]'),
  );
  await page.reload();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-fever')).toContainText('FEVER MAX 0');
  await readyResult();
  const reopenedState = await layoutState();
  const reopened = await page
    .locator('#results')
    .screenshot({ path: testInfo.outputPath('result-reopened-raw.png') });
  await testInfo.attach('result-original-raw', {
    body: original,
    contentType: 'image/png',
  });
  await testInfo.attach('result-reopened-raw', {
    body: reopened,
    contentType: 'image/png',
  });
  await writeFile(
    testInfo.outputPath('result-layout-pair.json'),
    JSON.stringify(
      { original: originalState, reopened: reopenedState },
      null,
      2,
    ),
  );
  await testInfo.attach('result-layout-pair', {
    body: JSON.stringify(
      { original: originalState, reopened: reopenedState },
      null,
      2,
    ),
    contentType: 'application/json',
  });
  // CI trace showed exactly one blue-channel antialiasing pixel (delta 4)
  // at the edge of the same text. Keep dimensions, content and all other pixels
  // strict; never allow moved labels, missing counts, focus or layout changes.
  const comparison = await page.evaluate(
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
        return { sameSize: false, changed: Infinity, maxChannel: Infinity };
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
    [original.toString('base64'), reopened.toString('base64')],
  );
  await writeFile(
    testInfo.outputPath('result-raw-comparison.json'),
    JSON.stringify(comparison),
  );
  await testInfo.attach('result-raw-comparison', {
    body: JSON.stringify(comparison),
    contentType: 'application/json',
  });
  expect(comparison.sameSize).toBe(true);
  expect(comparison.changed).toBeLessThanOrEqual(1);
  expect(comparison.maxChannel).toBeLessThanOrEqual(4);
  await page.screenshot({ path: 'test-results/result-direct.png' });
  await page.click('#retry');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#game')).toBeVisible();
  expect(await page.locator('body').getAttribute('class')).not.toMatch(
    /home-screen|ready-screen/,
  );
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await page.goto(url);
  await expect(page.locator('#results')).toBeVisible();
  await page.click('#back');
  await expect(page).toHaveURL(/\/select\//);
});
