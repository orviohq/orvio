import { test, expect } from '@playwright/test';
test('actual APT cached fallback recovers title author via live bound metadata only, without re-add', async ({
  page,
}) => {
  test.setTimeout(90000);
  const calls: string[] = [],
    errors: string[] = [];
  let metadataAllowed = false;
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('https://orvio-share.pn-26f.workers.dev/**', async (r) => {
    calls.push(r.request().method() + ' ' + r.request().url());
    if (r.request().method() !== 'GET') throw Error('No POST');
    if (r.request().url().endsWith('/metadata') && !metadataAllowed)
      return r.fulfill({
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: '{}',
      });
    return r.continue();
  });
  await page.route('https://orvio-play.pages.dev/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({
      url: 'http://127.0.0.1:4207' + url.pathname + url.search,
    });
    await route.fulfill({ response });
  });
  await page.goto('https://orvio-play.pages.dev/select/');
  await page.click('#add-youtube');
  await page.fill(
    '#youtube-url',
    'https://www.youtube.com/watch?v=ekr2nIex040',
  );
  await page.click('#youtube-submit');
  await expect(page.locator('#songs>[data-song]')).toHaveCount(4, {
    timeout: 30000,
  });
  await page.locator('#songs>[data-song]').first().click();
  await expect(page.locator('#selected-title')).toContainText('ekr2nIex040');
  const snapshot = () =>
    page.evaluate(async () => {
      const { allPinnedSources } = await import(
        /* @vite-ignore */ String('/src/external-source-store.ts')
      );
      const { localAudio } = await import(
        /* @vite-ignore */ String('/src/external-local.ts')
      );
      const record = (await allPinnedSources()).find(
        (r: { videoId: string }) => r.videoId === 'ekr2nIex040',
      )!;
      const asset = await localAudio(record);
      const sha = [
        ...new Uint8Array(await crypto.subtle.digest('SHA-256', asset!.bytes)),
      ]
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');
      return {
        record: JSON.stringify(record),
        sha,
        byteLength: asset!.bytes.byteLength,
      };
    });
  const before = await snapshot();
  expect(before.sha).toBe(
    '61d893d80b4fa3ac37ad2ce91385d6dfacd971eda77b42df3776be1dd0bbd58e',
  );
  await page.screenshot({ path: '/downloads/metadata-apt-before.png' });
  metadataAllowed = true;
  calls.length = 0;
  await page.reload();
  await expect(page.locator('#songs')).toContainText(
    'ROSÉ & Bruno Mars - APT. (Official Music Video)',
    { timeout: 15000 },
  );
  await page.locator('#songs>[data-song]').first().click();
  await expect(page.locator('#selected-title')).toHaveText(
    'ROSÉ & Bruno Mars - APT. (Official Music Video)',
  );
  await expect(page.locator('#selected-subtitle')).toHaveText('ROSÉ');
  expect(await snapshot()).toEqual(before);
  expect(calls.every((c) => c.endsWith('/metadata'))).toBe(true);
  expect(calls.length).toBe(1);
  await page.screenshot({ path: '/downloads/metadata-apt-after.png' });
  await page.reload();
  await expect(page.locator('#songs')).toContainText(
    'ROSÉ & Bruno Mars - APT. (Official Music Video)',
  );
  await page.locator('#songs>[data-song]').first().click();
  await page.click('#start');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  await page.waitForTimeout(5200);
  await page.screenshot({ path: '/downloads/metadata-apt-play.png' });
  expect(errors).toEqual([]);
  console.log(
    'APT_METADATA_ONLY_PROOF',
    JSON.stringify({
      audioSha: before.sha,
      byteLength: before.byteLength,
      canonicalUnchanged: true,
      calls,
      errors,
    }),
  );
});
