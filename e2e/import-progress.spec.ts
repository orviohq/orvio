import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
const base = 'https://orvio-share.pn-26f.workers.dev',
  id = 'WGm2HmXeeRI';
test('early metadata paints before admission finishes, actual queued/running states only, no automatic retry', async ({
  page,
}, info) => {
  let posts = 0,
    reads = 0;
  await page.route(base + '/**', async (route) => {
    const r = route.request(),
      u = r.url();
    if (u.includes('/youtube-metadata/'))
      return route.fulfill({
        json: {
          videoId: id,
          title: "QWER 'Discord' <b>literal</b>",
          author: 'QWER',
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          source: 'youtube-oembed',
        },
      });
    if (u.includes('/chart-sources/'))
      return route.fulfill({
        status: 404,
        json: { error: 'chart_source_not_found' },
      });
    if (r.method() === 'POST') {
      posts++;
      await new Promise((r) => setTimeout(r, 1800));
      return route.fulfill({
        json: { jobId: 'progress-job', status: 'queued', retryAfterSec: 3 },
      });
    }
    reads++;
    return route.fulfill({
      json:
        reads === 1
          ? { jobId: 'progress-job', status: 'running', retryAfterSec: 3 }
          : {
              jobId: 'progress-job',
              status: 'error',
              error: { code: 'unavailable' },
            },
    });
  });
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/' + id);
  await page.click('#youtube-submit');
  const row = page.locator(`[data-import-video="${id}"]`);
  await expect(row.locator('strong')).toHaveText(
    "QWER 'Discord' <b>literal</b>",
  );
  await expect(row).toHaveAttribute('data-import-stage', 'checking');
  expect(await row.locator('b').count()).toBe(0);
  await expect(row.locator('img')).toHaveAttribute(
    'src',
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  );
  await page.screenshot({ path: info.outputPath('early-title.png') });
  await expect(row).toHaveAttribute('data-import-stage', 'queued');
  await expect(row).toHaveAttribute('data-import-stage', 'extracting', {
    timeout: 7000,
  });
  await expect(row).toContainText('음원을 준비하고 있습니다');
  await page.screenshot({ path: info.outputPath('extracting.png') });
  await expect(row).toHaveAttribute('data-state', 'error', { timeout: 7000 });
  expect(posts).toBe(1);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});

const hash = (text: string | Buffer) =>
  createHash('sha256').update(text).digest('hex');
const keys = [
  '5:low',
  '5:mid',
  '5:high',
  '7:low',
  '7:mid',
  '7:high',
  '5:sc',
  '7:sc',
];
const wav = Buffer.alloc(768044);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(48000, 24);
wav.writeUInt32LE(192000, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(wav.length - 44, 40);
const notes = [{ id: 0, time: 1, lane: 0, end: 2 }];
const record: any = {
  version: 1,
  videoId: 'AAAAAAAAAAA',
  audioSha256: hash(wav),
  sampleRate: 48000,
  frames: 192000,
  estimatedBpm: 120,
  pipelineVersion: 'synthetic-test',
  analyzerVersion: 'synthetic-test',
  config: '{}',
  charts: Object.fromEntries(
    keys.map((k) => [k, { notes, sha256: hash(JSON.stringify(notes)) }]),
  ),
  chartMetadata: Object.fromEntries(
    keys.map((k) => [
      k,
      {
        version: 1,
        family: k.endsWith('low')
          ? 'NM'
          : k.endsWith('mid')
            ? 'HD'
            : k.endsWith('high')
              ? 'MX'
              : 'SC',
        rating: { scale: k.endsWith('sc') ? 'sc' : 'standard', level: 1 },
        status: 'rated',
      },
    ]),
  ),
};
record.chartSetSha256 = hash(
  JSON.stringify({
    analyzer: record.analyzerVersion,
    config: record.config,
    charts: keys.map((k) => [k, record.charts[k].sha256]),
    chartMetadata: record.chartMetadata,
  }),
);
const raw = JSON.stringify(record);
const sha = hash(raw);

test('successful import reports canonical charting and downloading, then Sonner only after save', async ({
  page,
}, info) => {
  let jobs = 0,
    canon = 0,
    posts = 0;
  const audio = {
    sha256: record.audioSha256,
    sizeBytes: wav.length,
    contentType: 'audio/wav',
    durationSec: 4,
    contractVersion: 'audio/1',
    expiresAt: null,
  };
  await page.route(base + '/**', async (route) => {
    const req = route.request(),
      u = req.url();
    if (u.includes('/youtube-metadata/'))
      return route.fulfill({
        status: 502,
        json: { error: 'metadata_unavailable' },
      });
    if (u.endsWith('/audio')) {
      await new Promise((r) => setTimeout(r, 1000));
      return route.fulfill({
        body: wav,
        headers: {
          'Content-Type': 'audio/wav',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers':
            'X-Content-SHA256,X-Canonical-Audio-SHA256,X-Source-Video-Id,X-Audio-Contract,Content-Length',
          'Content-Length': String(wav.length),
          'X-Canonical-Audio-SHA256': record.audioSha256,
          'X-Content-SHA256': record.audioSha256,
          'X-Source-Video-Id': record.videoId,
          'X-Audio-Contract': 'audio/1',
        },
      });
    }
    if (u.includes('/metadata'))
      return route.fulfill({
        status: 404,
        json: { error: 'chart_source_not_found' },
      });
    if (u.includes('/chart-sources/')) {
      canon++;
      if (canon < 3)
        return route.fulfill({
          status: 404,
          json: { error: 'chart_source_not_found' },
        });
      return route.fulfill({
        body: raw,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers':
            'X-SourceRecord-SHA256,X-ChartSet-SHA256,X-Canonical-Audio-SHA256',
          'X-SourceRecord-SHA256': sha,
          'X-ChartSet-SHA256': record.chartSetSha256,
          'X-Canonical-Audio-SHA256': record.audioSha256,
          'X-Canonical-Audio-Cached': 'true',
        },
      });
    }
    if (req.method() === 'POST') {
      posts++;
      return route.fulfill({
        json: {
          jobId: 'successful-job',
          status: 'done',
          title: 'Verified test song',
          author: 'Test Artist',
          audio,
          canonical: { status: 'generating', retryAfterSec: 1 },
        },
      });
    }
    jobs++;
    return route.fulfill({
      json: {
        jobId: 'successful-job',
        status: 'done',
        title: 'Verified test song',
        author: 'Test Artist',
        audio,
        canonical: {
          status: jobs > 1 ? 'published' : 'generating',
          retryAfterSec: 1,
        },
      },
    });
  });
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/' + record.videoId);
  await page.click('#youtube-submit');
  const row = page.locator(`[data-import-video="${record.videoId}"]`);
  await expect(row).toHaveAttribute('data-import-stage', 'charting');
  await expect(row).toHaveAttribute('data-import-stage', 'downloading', {
    timeout: 10000,
  });
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('downloading.png') });
  await expect(page.locator('[data-sonner-toast]')).toContainText(
    '이 기기에 저장됩니다',
    { timeout: 10000 },
  );
  await expect(row).toHaveCount(0);
  expect(posts).toBe(1);
  await expect(
    page.locator('.song-copy strong').filter({ hasText: 'Verified test song' }),
  ).toBeVisible();
  await page
    .locator('[data-sonner-toast]')
    .evaluate((e) =>
      Promise.all(e.getAnimations().map((a) => a.finished.catch(() => {}))),
    );
  await page.waitForTimeout(400);
  await page.screenshot({ path: info.outputPath('saved-toast.png') });
});

test('recorded live metadata paints in combined candidate; optional bounded production CORS check', async ({
  page,
}, info) => {
  const writes: string[] = [];
  await page.route(base + '/**', async (route) => {
    if (route.request().method() !== 'GET') {
      writes.push(route.request().method());
      return route.abort();
    }
    return route.continue();
  });
  let result = {
    status: 200,
    body: JSON.parse(
      readFileSync('e2e/fixtures/live-youtube-metadata.json', 'utf8'),
    ),
  };
  if (process.env.ORVIO_LIVE_METADATA === '1') {
    await page.goto('https://orvio-play.pages.dev/select/');
    result = await page.evaluate(async () => {
      const r = await fetch(
        'https://orvio-share.pn-26f.workers.dev/v1/youtube-metadata/WGm2HmXeeRI',
        { credentials: 'omit', cache: 'no-store' },
      );
      return { status: r.status, body: await r.json() };
    });
  }
  expect(result.status).toBe(200);
  expect(result.body.title).toBe("QWER 'Discord' Official MV");
  console.log('METADATA_BROWSER_OR_RECORDED_FIXTURE', JSON.stringify(result));
  await page.unroute(base + '/**');
  let posts = 0;
  await page.route(base + '/**', async (route) => {
    const r = route.request();
    if (r.url().includes('/youtube-metadata/'))
      return route.fulfill({ json: result.body });
    if (r.method() === 'POST') {
      posts++;
      await new Promise((r) => setTimeout(r, 1800));
      return route.fulfill({
        json: {
          jobId: 'bounded-live-body',
          status: 'queued',
          retryAfterSec: 30,
        },
      });
    }
    return route.fulfill({
      status: 404,
      json: { error: 'chart_source_not_found' },
    });
  });
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/WGm2HmXeeRI');
  await page.click('#youtube-submit');
  await expect(
    page.locator('[data-import-video="WGm2HmXeeRI"] strong'),
  ).toHaveText(result.body.title);
  await page.screenshot({
    path: info.outputPath('actual-title-candidate.png'),
  });
  expect(writes).toEqual([]);
  await expect.poll(() => posts).toBe(1);
});
