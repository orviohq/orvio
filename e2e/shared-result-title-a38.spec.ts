import fs from 'node:fs';
import { test, expect } from '@playwright/test';
test('new A38 external result title survives reload and matching display metadata recovery', async ({
  page,
  context,
}) => {
  const f = JSON.parse(
    fs.readFileSync('/downloads/v027-synthetic-fixture.json', 'utf8'),
  );
  await page.goto('/select/');
  const fragment = await page.evaluate(async (raw) => {
    const record = JSON.parse(raw);
    const { sourceId } = await import(
      /* @vite-ignore */ String('/src/external-catalog.ts')
    );
    const { encodeExternalShare, externalReplayEngine } = await import(
      /* @vite-ignore */ String('/src/external-share.ts')
    );
    const replay: any = {
      version: 1,
      song: sourceId(record),
      lanes: 5,
      difficulty: 'low',
      options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 1 },
      ops: [[1, 3000, 9999]],
      end: 3000,
    };
    const engine = externalReplayEngine(replay, record);
    engine.update(9999);
    return encodeExternalShare({
      record,
      replay,
      title: 'A38 Verified Result Title',
      result: {
        song: replay.song,
        lanes: 5,
        difficulty: 'low',
        options: replay.options,
        score: engine.score,
        accuracy: engine.sum / engine.total,
        combo: engine.maxCombo,
        judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
          (v) => engine.events.filter((e: any) => e.value === v).length,
        ),
      },
    });
  }, f.records[0].raw);
  fs.writeFileSync('/downloads/a38-result-fragment.txt', fragment);
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
      path: `/downloads/a38-result-fixed-${origins.indexOf(origin)}.png`,
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
    '/downloads/a38-shared-result-fixed.json',
    JSON.stringify(all, null, 2),
  );
  console.log(JSON.stringify(all));
  for (const x of all)
    expect(x.samples).toEqual(Array(6).fill('A38 Verified Result Title'));
});
