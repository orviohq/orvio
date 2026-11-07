import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('actual production origin can read existing audio job and verify full WAV integrity', async ({
  page,
}) => {
  await page.goto('https://orvio-play.pages.dev/');
  const r = await page.evaluate(async () => {
    const base =
      'https://orvio-share.pn-26f.workers.dev/v1/audio-jobs/d02daad1-1efc-4a09-a67c-cfc2578131b7';
    const status = await fetch(base);
    const job = await status.json();
    const audio = await fetch(base + '/audio');
    const bytes = await audio.arrayBuffer();
    const sha = Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    const dv = new DataView(bytes);
    let at = 12,
      sr = 0,
      frames = 0;
    while (at + 8 <= bytes.byteLength) {
      const size = dv.getUint32(at + 4, true),
        tag = dv.getUint32(at);
      if (tag === 0x666d7420) sr = dv.getUint32(at + 12, true);
      if (tag === 0x64617461) frames = size / 4;
      at += 8 + size + (size & 1);
    }
    return {
      origin: location.origin,
      status: status.status,
      job,
      audioStatus: audio.status,
      hashHeader: audio.headers.get('X-Content-SHA256'),
      source: audio.headers.get('X-Source-Video-Id'),
      contract: audio.headers.get('X-Audio-Contract'),
      bytes: bytes.byteLength,
      sha,
      sr,
      frames,
      duration: frames / sr,
    };
  });
  expect(r.origin).toBe('https://orvio-play.pages.dev');
  expect(r.status).toBe(200);
  expect(r.audioStatus).toBe(200);
  expect(r.sha).toBe(r.hashHeader);
  expect(r.sha).toBe(
    'd3e86159ff80c746cbf9ebaa3df2bb8b21b8d5d7ef8e6c2291cd9c2faa3d2228',
  );
  expect(r.bytes).toBe(24056664);
  expect(r.sr).toBe(48000);
  expect(r.frames).toBe(6014155);
  expect(r.source).toBe('uXn-zOt68V8');
  expect(r.contract).toBe('audio/1');
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(
    'test-results/production-origin-audio.json',
    JSON.stringify(r, null, 2),
  );
});
