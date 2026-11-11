import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { externalResultFixtureFragment } from './external-result-fixture';

const fixture = JSON.parse(
  readFileSync('e2e/fixtures/v027-synthetic-fixture.json', 'utf8'),
);

for (const width of [1280, 390]) {
  test(`ORV-91-QA-2: result replay audio recovery dismissal ${width}`, async ({
    page,
  }, info) => {
    test.setTimeout(30000);
    await page.addInitScript(()=>localStorage.setItem('orvio.settings.v1',JSON.stringify({language:'ko',languageMode:'manual'}))); 
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const errors: string[] = [];
    const attempts: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === new URL(process.env.ORV91_BASE_URL??'http://127.0.0.1:4191').origin) {
        await route.continue();
        return;
      }
      attempts.push(`${request.method()} ${request.url()}`);
      await route.abort();
    });

    // The codec carries the genuine frozen record and matching replay. Each
    // test has fresh browser storage: no audio bytes are seeded or downloaded.
    expect(JSON.parse(fixture.records[0].raw).manifestSha256).toBeUndefined();
    await page.goto('/select/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await expect(page.locator('#songs')).toBeVisible();
    await expect(page.locator('#songs .song-card').first()).toBeVisible();
    const fragment = await externalResultFixtureFragment(
      page,
      fixture.records[0].raw,
    );
    await page.goto('/result/#' + fragment, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    const results = page.locator('#results');
    await expect(results).toBeVisible();
    const originalURL = page.url();
    const title = await page.locator('#result-song').textContent();
    const watch = page.locator('#watch-replay');
    await expect(watch).toBeVisible();
    await expect(watch).toBeEnabled();
    await watch.click();

    // showAudioRecovery creates this production dialog only after the real
    // watchReplay -> readSharedAudio failure; result-load errors are excluded
    // by the visible results and replay-button assertions above.
    const recovery = page.locator('dialog.share-error');
    await expect(recovery).toBeVisible();
    await expect(recovery).toHaveAttribute('open', '');
    await expect(recovery.locator('button')).toHaveCount(2);
    await expect(recovery.locator('button.primary')).toBeEnabled();
    await expect(page.locator('html')).toHaveAttribute('lang','ko');
    await expect(recovery.locator('button.primary')).toHaveText('음원 다시 준비');
    await expect(recovery.locator('button').last()).toHaveText('닫기');
    await expect(recovery.locator('p')).not.toBeEmpty();
    await expect(watch).toBeEnabled();
    await recovery.locator('p').click();
    await expect(recovery).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`audio-recovery-${width}.png`),
    });

    const bounds = await recovery.boundingBox();
    expect(bounds).not.toBeNull();
    const viewport = page.viewportSize()!;
    const outside = [
      { x: 2, y: 2 },
      { x: viewport.width - 2, y: 2 },
      { x: 2, y: viewport.height - 2 },
      { x: viewport.width - 2, y: viewport.height - 2 },
    ].find(
      ({ x, y }) =>
        x < bounds!.x - 4 ||
        x > bounds!.x + bounds!.width + 4 ||
        y < bounds!.y - 4 ||
        y > bounds!.y + bounds!.height + 4,
    );
    expect(outside, 'a real backdrop point must fit the viewport').toBeDefined();
    await page.mouse.click(outside!.x, outside!.y);
    await expect(recovery).toHaveCount(0);
    await expect(results).toBeVisible();
    await expect(page).toHaveURL(originalURL);
    await expect(page.locator('#result-song')).toHaveText(title!);
    await expect(watch).toBeEnabled();

    await info.attach('network-attempts', {
      body: JSON.stringify(attempts, null, 2),
      contentType: 'application/json',
    });
    expect(attempts.filter((request) => !request.startsWith('GET '))).toEqual([]);
    expect(
      attempts.filter((request) => /\/(?:audio-)?jobs(?:[/?]|$)/.test(request)),
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
}
