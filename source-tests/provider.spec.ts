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
      saved: await store.readPinnedSource(
        record.videoId,
        record.audioSha256,
        record.chartSetSha256,
      ),
    };
  });
  expect(r.status).toBe('saved');
  expect(r.record).toEqual(r.saved);
  expect(r.record.sampleRate).toBe(48000);
  expect(r.record.frames).toBe(6014155);
  expect(Object.keys(r.record.charts)).toHaveLength(6);
  expect(
    Object.fromEntries(
      Object.entries(r.record.charts).map(([k, v]) => [k, v.sha256]),
    ),
  ).toEqual({
    '5:low': '592c7f0de678f4b282f13a93a6ff7c0c280e1be451063d6c0e89b7256059a42d',
    '5:mid': '989e0d02e8d26138c9f8c1f8403d48577bf9777c82cb2c8cadedf07125972d6f',
    '5:high':
      '930f0c045f357d4ebf6fbdb927a23b2f1a1def817a646292d3bc514fb6ac4225',
    '7:low': '31c6ef499c79229da3b332061c388e5ff858a30d108f11455828c02fbae54026',
    '7:mid': '1bfcf5ac3b8359fc30f62073e6a28b9a469d01055fc6ef93057d62292870514d',
    '7:high':
      '0201939738d394b27945203dae387bda76ca21183b1c547287398963a7037436',
  });
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(
    'test-results/source48000-pin.json',
    JSON.stringify(r, null, 2),
  );
});
