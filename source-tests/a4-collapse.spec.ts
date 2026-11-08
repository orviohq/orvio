import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('collapsed SC keeps sixchart import metadata pin and UI available without inventing a variant', async ({
  page,
}) => {
  await page.route('**/src/c3-runtime-research.ts', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: `export function generateC3Runtime(){const charts={};for(const lanes of [5,7])for(const tier of ['low','mid','high','sc'])charts[lanes+':'+tier]=[{id:0,lane:0,time:1}];return{charts,duration:125.294875,analyzerVersion:'test-collapse'}}`,
    }),
  );
  await page.goto('/select/');
  await page.evaluate(() => {
    const i = document.createElement('input');
    i.type = 'file';
    i.id = 'testaudio';
    document.body.append(i);
  });
  await page.locator('#testaudio').setInputFiles('fixtures/audio1.wav');
  const result = await page.evaluate(async () => {
    const { generateSourceRecord } =
        await import('/src/external-source-provider.ts'),
      { pinSource } = await import('/src/external-source-store.ts'),
      { verifyChartHashes } = await import('/src/external-source.ts'),
      { saveLocalAudio } = await import('/src/external-local.ts');
    const bytes = await (
      document.querySelector('#testaudio') as HTMLInputElement
    ).files![0].arrayBuffer();
    const r = await generateSourceRecord(
      bytes,
      'uXn-zOt68V8',
      'd3e86159ff80c746cbf9ebaa3df2bb8b21b8d5d7ef8e6c2291cd9c2faa3d2228',
    );
    await pinSource(r);
    await saveLocalAudio(r, 'Collapse fixture', 'no-network', bytes);
    return {
      keys: Object.keys(r.charts),
      meta: Object.keys(r.chartMetadata!),
      valid: await verifyChartHashes(r),
    };
  });
  expect(result.keys).toHaveLength(6);
  expect(result.meta).toEqual(result.keys);
  expect(result.valid).toBe(true);
  await page.unroute('**/src/c3-runtime-research.ts');
  await page.reload();
  await page.locator('[data-song="3"]').click();
  await expect(page.locator('[data-diff=sc]')).toBeDisabled();
  await expect(page.locator('[data-diff=sc]')).toHaveText('SC --');
  await expect(page.locator('#start')).toBeEnabled();
  await page.screenshot({ path: 'test-results/a4-sc-unavailable.png' });
});
