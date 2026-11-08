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
