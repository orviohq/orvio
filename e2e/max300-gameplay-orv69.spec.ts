import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const sampleRate = 44100,
  frames = sampleRate * 300,
  audio = Buffer.alloc(44 + frames * 4);
audio.write('RIFF');
audio.writeUInt32LE(audio.length - 8, 4);
audio.write('WAVEfmt ', 8);
audio.writeUInt32LE(16, 16);
audio.writeUInt16LE(1, 20);
audio.writeUInt16LE(2, 22);
audio.writeUInt32LE(sampleRate, 24);
audio.writeUInt32LE(sampleRate * 4, 28);
audio.writeUInt16LE(4, 32);
audio.writeUInt16LE(16, 34);
audio.write('data', 36);
audio.writeUInt32LE(frames * 4, 40);
for (let i = 0; i < frames; i++) {
  const t = i / sampleRate,
    beat = t % 0.35,
    env = Math.exp(-beat * 35),
    tone = Math.sin(2 * Math.PI * (180 + (Math.floor(t / 0.35) % 7) * 120) * t),
    v = Math.round(24000 * env * tone);
  audio.writeInt16LE(v, 44 + i * 4);
  audio.writeInt16LE(v, 46 + i * 4);
}
const sha = createHash('sha256').update(audio).digest('hex');
const f = {
  record: { videoId: 'A69BROWSER1', audioSha256: sha, frames, sampleRate },
  audioHeaders: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers':
      'Content-Length,X-Content-SHA256,X-Canonical-Audio-SHA256,X-Source-Video-Id,X-Audio-Contract',
    'Content-Type': 'audio/wav',
    'Content-Length': String(audio.length),
    'X-Content-SHA256': sha,
    'X-Canonical-Audio-SHA256': sha,
    'X-Source-Video-Id': 'A69BROWSER1',
    'X-Audio-Contract': 'audio/1',
  },
};

test('maximum 300s generated chart enters actual desktop gameplay without renewed audio download', async ({
  page,
}) => {
  test.setTimeout(60000);
  page.on('console', (m) => console.log('BROWSER', m.type(), m.text()));
  const calls: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) => {
    const q = r.request(),
      p = new URL(q.url()).pathname;
    calls.push(q.method() + ' ' + p);
    const job = {
      jobId: 'clientJob',
      status: 'done',
      generationMode: 'client',
      canonical: {
        status: 'client_generation',
        audioSha256: f.record.audioSha256,
      },
      title: 'Local generated fixture',
      audio: {
        sha256: f.record.audioSha256,
        sizeBytes: audio.length,
        contentType: 'audio/wav',
        durationSec: f.record.frames / f.record.sampleRate,
        contractVersion: 'audio/1',
        expiresAt: null,
      },
    };
    if (q.method() === 'POST') {
      expect(p).toBe('/v1/audio-jobs');
      expect(q.postDataJSON().generationMode).toBe('client');
      return r.fulfill({ json: job });
    }
    if (p.includes('/audio-sources/') || p.endsWith('/audio'))
      return r.fulfill({ body: audio, headers: f.audioHeaders });
    if (p.startsWith('/v1/audio-jobs/')) return r.fulfill({ json: job });
    if (p.endsWith('/metadata'))
      return r.fulfill({
        json: {
          videoId: f.record.videoId,
          title: job.title,
          audioSha256: f.record.audioSha256,
        },
      });
    return r.fulfill({
      status: 404,
      json: { error: 'chart_source_not_found' },
    });
  });
  await page.route('https://www.youtube.com/**', (r) =>
    r.fulfill({ status: 404 }),
  );
  await page.route('https://i.ytimg.com/**', (r) =>
    r.fulfill({
      contentType: 'image/png',
      body: fs.readFileSync('public/wallpapers/first-light.png'),
    }),
  );
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill(
    '#youtube-url',
    'https://www.youtube.com/watch?v=' + f.record.videoId,
  );
  await page.click('#youtube-submit');
  await expect(page.locator('.import-pending')).toHaveCount(0, {
    timeout: 20000,
  });
  const row = page
    .locator('#songs>[data-song]')
    .filter({ hasText: 'Local generated fixture' });
  await expect(row).toBeVisible();
  const snapshot = () =>
    page.evaluate(async () => {
      const open = (name: string) =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const q = indexedDB.open(name);
          q.onsuccess = () => resolve(q.result);
          q.onerror = () => reject(q.error);
        });
      const getAll = async (name: string, store: string) => {
        const d = await open(name);
        return new Promise<any[]>((resolve, reject) => {
          const q = d.transaction(store).objectStore(store).getAll();
          q.onsuccess = () => {
            d.close();
            resolve(q.result);
          };
          q.onerror = () => reject(q.error);
        });
      };
      return {
        refs: JSON.parse(
          localStorage.getItem('orvio.local-generated-library.v1') || '[]',
        ),
        canonical: localStorage.getItem('orvio.canonical-library.v1'),
        records: await getAll('orvio.external-sources.v1', 'records'),
        audio: (await getAll('orvio.external-library.v1', 'audio')).map(
          (r) => ({ key: r.key, bytes: r.bytes.byteLength }),
        ),
      };
    });
  const before = await snapshot();
  expect(before.refs).toHaveLength(1);
  expect(before.canonical).toBeNull();
  expect(before.records[0].record.sourceProvenance).toBe('local-current35-v1');
  expect(before.records[0].record.analyzerVersion).toContain('budget-v1');
  expect(before.audio[0].bytes).toBe(audio.length);
  await page.reload();
  await expect(
    page
      .locator('#songs>[data-song]')
      .filter({ hasText: 'Local generated fixture' }),
  ).toBeVisible();
  const after = await snapshot();
  expect(after).toEqual(before);
  const downloads = calls.filter((c) => c.endsWith('/audio')).length;
  await page
    .locator('#songs>[data-song]')
    .filter({ hasText: 'Local generated fixture' })
    .click();
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const frameTiming = await page.evaluate(async () => {
    const intervals: number[] = [];
    let previous = performance.now();
    const end = previous + 10000;
    await new Promise<void>((resolve) => {
      const sample = (now: number) => {
        intervals.push(now - previous);
        previous = now;
        if (now < end) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    const sorted = [...intervals].sort((a, b) => a - b);
    return {
      samples: intervals.length,
      average: intervals.reduce((a, b) => a + b, 0) / intervals.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      max: sorted.at(-1),
      over33: intervals.filter((n) => n > 33.4).length,
    };
  });
  console.log('MAX300_DESKTOP_GAMEPLAY_TIMING', JSON.stringify(frameTiming));
  expect(frameTiming.samples).toBeGreaterThan(500);
  expect(frameTiming.p95).toBeLessThan(34);
  expect(calls.filter((c) => c.endsWith('/audio'))).toHaveLength(downloads);
  await page.screenshot({ path: '/downloads/orv69-max300-actual-play.png' });
  expect(calls.filter((c) => c.startsWith('POST '))).toEqual([
    'POST /v1/audio-jobs',
  ]);
  expect(errors).toEqual([]);
  console.log(
    'CLIENT_LOCAL_PROOF',
    JSON.stringify({
      calls,
      refs: before.refs,
      record: before.records[0].record.analyzerVersion,
      audio: before.audio,
    }),
  );
});
