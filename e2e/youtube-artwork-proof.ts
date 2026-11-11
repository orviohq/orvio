import { expect, type Page, type Locator } from '@playwright/test';

export function isThumbnailRequest(url: URL) {
  return (
    url.origin === 'https://i.ytimg.com' &&
    /^\/vi\/[A-Za-z0-9_-]{11}\/(?:maxresdefault|mqdefault|hqdefault)\.jpg$/.test(
      url.pathname,
    ) &&
    !url.search
  );
}

/** Decode actual persisted image pixels, not the successfully loaded fallback. */
export async function expectArtwork(image: Locator) {
  await expect
    .poll(
      () =>
        image.evaluate((img: HTMLImageElement) => ({
          blob: img.currentSrc.startsWith('blob:'),
          decoded: img.naturalWidth >= 240 && img.naturalHeight >= 135,
        })),
      { timeout: 20000 },
    )
    .toEqual({ blob: true, decoded: true });
  const pixels = await image.evaluate(async (img: HTMLImageElement) => {
    const bytes = await (await fetch(img.currentSrc)).arrayBuffer();
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (x) => x.toString(16).padStart(2, '0'),
    ).join('');
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      bytes: bytes.byteLength,
      hash,
    };
  });
  console.log('Artwork pixels:', JSON.stringify(pixels));
  return pixels;
}

/** Static shell remains served by the local test server; every external request
 * is forbidden and navigator reports offline, even across a fresh document. */
export async function offlineImages(page: Page) {
  if (process.env.ORV96_FULL_OFFLINE) {
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.context().setOffline(true);
    return;
  }
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'onLine', { get: () => false }),
  );
  await page.route('https://**/*', (route) =>
    route.abort('internetdisconnected'),
  );
}
