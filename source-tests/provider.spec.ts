import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('real backend-artifact PCM48000 generates6 charts and pins exact source atomically', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'source-file';
    document.body.append(input);
  });
  await page.locator('#source-file').setInputFiles('fixtures/audio1.wav');
  const r = await page.evaluate(async () => {
    const { generateSourceRecord } =
      await import('/src/external-source-provider.ts');
    const store = await import('/src/external-source-store.ts');
    const record = await generateSourceRecord(
      await (
        document.querySelector('#source-file') as HTMLInputElement
      ).files![0].arrayBuffer(),
      'uXn-zOt68V8',
      'd3e86159ff80c746cbf9ebaa3df2bb8b21b8d5d7ef8e6c2291cd9c2faa3d2228',
    );
    const status = await store.pinSource(record);
    return {
      record,
      status,
      saved: await store.readPinnedSource(record.videoId, record.audioSha256),
    };
  });
  expect(r.status).toBe('saved');
  expect(r.record).toEqual(r.saved);
  expect(r.record.sampleRate).toBe(48000);
  expect(r.record.frames).toBe(6014155);
  expect(Object.keys(r.record.charts)).toHaveLength(6);
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(
    'test-results/source48000-pin.json',
    JSON.stringify(r, null, 2),
  );
});
