import fs from 'node:fs';
import { externalResultFixtureFragment } from './external-result-fixture';
import { test, expect } from '@playwright/test';
test('new A38 external result title survives reload and matching display metadata recovery', async ({
  page,
  context,
}) => {
  const f = JSON.parse(
    fs.readFileSync('e2e/fixtures/v027-synthetic-fixture.json', 'utf8'),
  );
  await page.goto('/select/');
  const fragment = await externalResultFixtureFragment(page, f.records[0].raw);
  const origins = process.env.A38_PUBLIC
    ? ['https://orvio-play.pages.dev', 'https://orvio-4n8.pages.dev']
    : ['http://127.0.0.1:4207'];
  const all = [];
  const snapshots: any[] = [];
  for (const origin of origins) {
    const c = await context.browser()!.newContext({ serviceWorkers: 'block' });
    const p = await c.newPage();
    const calls: string[] = [];
    let metadataMode = 'missing';
    await p.route('https://orvio-share.pn-26f.workers.dev/**', async (r) => {
      calls.push(r.request().method() + ' ' + r.request().url());
      if (r.request().method() !== 'GET') throw Error('No mutation');
      if (
        r.request().url().endsWith('/metadata') &&
        metadataMode !== 'missing'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return r.fulfill({
          json: {
            videoId: 'AAAAAAAAAAA',
            title: 'Bound metadata title',
            author: null,
            durationSec: 1,
            audioSha256: metadataMode === 'wrong' ? '0'.repeat(64) : f.sha,
            chartSetSha256: f.records[0].chartSet,
            source: 'audio-manifest',
          },
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }
      return r.fulfill({
        status: 404,
        body: '{}',
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    });
    const samples = [];
    await p.goto(origin + '/result/#' + fragment);
    await expect(p.locator('#results')).toBeVisible();
    samples.push(await p.locator('#result-song').textContent());
    const snapshot = () =>
      p.evaluate(async () => {
        const { allPinnedSources } = await import(
          /* @vite-ignore */ String('/src/external-source-store.ts')
        );
        return JSON.stringify(await allPinnedSources());
      });
    const originalFragment = new URL(p.url()).hash;
    if (!process.env.A38_PUBLIC) snapshots.push(await snapshot());
    await p.waitForTimeout(700);
    samples.push(await p.locator('#result-song').textContent());
    for (let i = 0; i < 2; i++) {
      await p.reload();
      await expect(p.locator('#results')).toBeVisible();
      samples.push(await p.locator('#result-song').textContent());
      await p.waitForTimeout(700);
      samples.push(await p.locator('#result-song').textContent());
    }
    expect(new URL(p.url()).hash).toBe(originalFragment);
    if (!process.env.A38_PUBLIC)
      expect(await snapshot()).toBe(snapshots.at(-1));
    await p.screenshot({
      path: test
        .info()
        .outputPath(`a38-result-fixed-${origins.indexOf(origin)}.png`),
    });
    if (!process.env.A38_PUBLIC) {
      const resultBefore = await p
        .locator(
          '#result-score,#result-rate,#result-combo,#result-break,#judgment-list',
        )
        .allTextContents();
      metadataMode = 'wrong';
      await p.reload();
      await expect(p.locator('#results')).toBeVisible();
      await p.waitForTimeout(600);
      await expect(p.locator('#result-song')).toHaveText(
        'A38 Verified Result Title',
      );
      metadataMode = 'valid';
      await p.reload();
      await expect(p.locator('#results')).toBeVisible();
      await expect(p.locator('#result-song')).toHaveText(
        'Bound metadata title',
      );
      expect(
        await p
          .locator(
            '#result-score,#result-rate,#result-combo,#result-break,#judgment-list',
          )
          .allTextContents(),
      ).toEqual(resultBefore);
      expect(new URL(p.url()).hash).toBe(originalFragment);
      expect(await snapshot()).toBe(snapshots.at(-1));
      expect(
        calls.every((x) => x.startsWith('GET ') && !x.endsWith('/audio')),
      ).toBe(true);
    }
    all.push({ origin, samples, calls });
    await c.close();
  }
  fs.writeFileSync(
    test.info().outputPath('a38-shared-result-fixed.json'),
    JSON.stringify(all, null, 2),
  );
  console.log(JSON.stringify(all));
  for (const x of all)
    expect(x.samples).toEqual(Array(6).fill('A38 Verified Result Title'));
});
