import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('real origin backend to client analysis to atomic pin and revisit', async ({
  page,
}) => {
  let posts = 0;
  page.on('request', (r) => {
    if (r.method() === 'POST') posts++;
  });
  await page.goto('https://orvio-play.pages.dev/');
  await page.addScriptTag({
    content: fs.readFileSync('source-harness/flow.iife.js', 'utf8'),
  });
  const first = await page.evaluate(async () => {
    const p = await (window as any).ExternalFlow.prepareExternalJob(
      'uXn-zOt68V8',
      'd02daad1-1efc-4a09-a67c-cfc2578131b7',
    );
    return { restored: p.restored, record: p.record, size: p.bytes.byteLength };
  });
  expect(first.restored).toBe(false);
  expect(first.size).toBe(24056664);
  expect(first.record.sampleRate).toBe(48000);
  expect(Object.keys(first.record.charts)).toHaveLength(8);
  await page.reload();
  await page.addScriptTag({
    content: fs.readFileSync('source-harness/flow.iife.js', 'utf8'),
  });
  const second = await page.evaluate(async () => {
    const p = await (window as any).ExternalFlow.prepareExternalJob(
      'uXn-zOt68V8',
      'd02daad1-1efc-4a09-a67c-cfc2578131b7',
    );
    return { restored: p.restored, record: p.record, size: p.bytes.byteLength };
  });
  expect(second.restored).toBe(true);
  expect(second.record).toEqual(first.record);
  expect(posts).toBe(0);
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(
    'test-results/live-flow.json',
    JSON.stringify({ first, second }, null, 2),
  );
});
