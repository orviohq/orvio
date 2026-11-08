import { test, expect } from '@playwright/test';
for (const [status, code] of [
  [409, 'client_audio_not_cached'],
  [503, 'client_generation_disabled'],
] as const)
  test(`cached-only ${code} is honest and makes no fallback POST`, async ({
    page,
  }) => {
    const posts: any[] = [],
      errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('https://orvio-share.pn-26f.workers.dev/**', async (r) => {
      if (r.request().method() === 'POST') {
        posts.push(r.request().postDataJSON());
        return r.fulfill({
          status,
          json: { error: { code } },
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }
      return r.fulfill({
        status: 404,
        json: { error: 'chart_source_not_found' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    });
    await page.goto('/select/');
    await page.click('#add-youtube');
    await page.fill('#youtube-url', 'https://youtu.be/AAAAAAAAAAA');
    await page.click('#youtube-submit');
    const row = page.locator(`.import-pending[data-import-error=${code}]`);
    await expect(row).toBeVisible();
    await expect(row.locator('[role=status]')).toContainText(
      '저장된 곡은 그대로 유지됩니다',
    );
    expect(posts).toEqual([
      {
        youtubeUrl: 'https://www.youtube.com/watch?v=AAAAAAAAAAA',
        generationMode: 'client',
      },
    ]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `/downloads/orv69-cached-${status}.png` });
  });
test('flag-off pending job stops polling without fallback admission', async ({
  page,
}) => {
  let polls = 0,
    posts = 0;
  await page.addInitScript(() =>
    localStorage.setItem(
      'orvio.pending-imports.v1',
      JSON.stringify([
        { videoId: 'AAAAAAAAAAA', jobId: 'cachedJob', state: 'loading' },
      ]),
    ),
  );
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) => {
    if (r.request().method() === 'POST') posts++;
    if (r.request().url().endsWith('/audio-jobs/cachedJob')) {
      polls++;
      return r.fulfill({
        status: 503,
        json: { error: { code: 'client_generation_disabled' } },
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
    return r.fulfill({
      status: 404,
      json: { error: 'chart_source_not_found' },
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });
  await page.goto('/select/');
  await expect(
    page.locator(
      '.import-pending[data-import-error=client_generation_disabled]',
    ),
  ).toBeVisible();
  await page.waitForTimeout(3300);
  expect(polls).toBe(1);
  expect(posts).toBe(0);
});

for (const [status, raw] of [
  [502, 'storage_error'],
  [429, 'share_quota_exhausted'],
] as const)
  test(`flat marker ${raw} stops after one client POST and stays honest`, async ({
    page,
  }) => {
    let posts = 0;
    await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) => {
      if (r.request().method() === 'POST') {
        posts++;
        expect(r.request().postDataJSON().generationMode).toBe('client');
        return r.fulfill({ status, json: { error: raw } });
      }
      return r.fulfill({
        status: 404,
        json: { error: 'chart_source_not_found' },
      });
    });
    await page.goto('/select/');
    await page.click('#add-youtube');
    await page.fill('#youtube-url', 'https://youtu.be/AAAAAAAAAAA');
    await page.click('#youtube-submit');
    const row = page.locator('.import-pending[data-import-error=unavailable]');
    await expect(row).toBeVisible();
    expect(await row.getAttribute('data-import-error-status')).toBe(
      String(status),
    );
    await page.waitForTimeout(400);
    expect(posts).toBe(1);
    await expect(row.locator('[role=status]')).not.toContainText(
      /storage_error|share_quota_exhausted/,
    );
  });
