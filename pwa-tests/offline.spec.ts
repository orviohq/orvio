import { test, expect } from '@playwright/test';
test('desktop installability, exact local song cache and offline warm start', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Page.enable');
  expect(
    (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors,
  ).toEqual([]);
  expect((await cdp.send('Page.getAppManifest')).errors).toEqual([]);
  for (const song of ['first-light', 'afterimage', 'violet-drive']) {
    await page.goto(`/play/${song}/5/low/`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
    await page.keyboard.press('Escape');
    await expect
      .poll(() =>
        page.evaluate(
          async (id) =>
            new Promise<boolean>((resolve) => {
              const r = indexedDB.open('orvio-audio', 1);
              r.onsuccess = () => {
                const db = r.result,
                  q = db
                    .transaction('tracks')
                    .objectStore('tracks')
                    .get('synth-1:' + id);
                q.onsuccess = () => {
                  resolve(
                    !!q.result &&
                      q.result.channels.length === 2 &&
                      q.result.rate === 44100,
                  );
                  db.close();
                };
              };
            }),
          song,
        ),
      )
      .toBe(true);
  }
  await context.setOffline(true);
  await page.goto('/play/first-light/5/low/');
  const begin = Date.now();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
  expect(Date.now() - begin).toBeLessThan(900);
  await expect(page.locator('#home-screen')).toBeHidden();
  const keys = await page.evaluate(() => caches.keys());
  expect(keys.filter((k) => k.startsWith('orvio-static-')).length).toBe(1);
});

test('application update waits for old windows then removes only old Orvio caches', async ({
  browser,
}) => {
  const { createServer } = await import('node:http');
  const { readFile } = await import('node:fs/promises');
  const { join, extname } = await import('node:path');
  let revision = 'old';
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      let path = url.pathname;
      if (path.endsWith('/')) path += 'index.html';
      const file = await readFile(join(process.cwd(), 'dist', path));
      res.setHeader('Cache-Control', 'no-store');
      const types: Record<string, string> = {
        '.js': 'application/javascript',
        '.html': 'text/html',
        '.css': 'text/css',
        '.ttf': 'font/ttf',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
        '.png': 'image/png',
      };
      res.setHeader(
        'Content-Type',
        types[extname(path)] || 'application/octet-stream',
      );
      res.end(
        path === '/sw.js'
          ? file
              .toString()
              .replace(
                /orvio-static-[a-f0-9]+/g,
                'orvio-static-test-' + revision,
              )
          : file,
      );
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.evaluate(() => caches.open('unrelated-cache'));
    revision = 'new';
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r!.update();
    });
    await expect
      .poll(() =>
        page.evaluate(
          async () =>
            !!(await navigator.serviceWorker.getRegistration())?.waiting,
        ),
      )
      .toBe(true);
    expect(await page.evaluate(() => caches.keys())).toContain(
      'orvio-static-test-old',
    );
    // An active old window keeps the update waiting, without reloading gameplay.
    expect(
      await page.evaluate(
        async () =>
          !!(await navigator.serviceWorker.getRegistration())?.waiting,
      ),
    ).toBe(true);
    await page.close();
    const next = await context.newPage();
    await next.goto(`http://127.0.0.1:${port}/`);
    await expect
      .poll(() =>
        next.evaluate(async () => {
          const k = await caches.keys();
          return (
            k.includes('orvio-static-test-new') &&
            !k.includes('orvio-static-test-old')
          );
        }),
      )
      .toBe(true);
    expect(await next.evaluate(() => caches.keys())).toContain(
      'unrelated-cache',
    );
  } finally {
    await context.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
