import { test, expect } from '@playwright/test';
import { AUDIO_STORAGE_FULL } from '../src/audio-storage-full';
import { LANGUAGES } from '../src/i18n';
test('full storage is distinct in all thirteen languages and never silently retries a new extraction', async ({
  page,
}) => {
  const requests: { url: string; method: string }[] = [];
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) => {
    requests.push({ url: r.request().url(), method: r.request().method() });
    return r.fulfill({
      status: r.request().method() === 'POST' ? 503 : 404,
      contentType: 'application/json',
      body:
        r.request().method() === 'POST'
          ? JSON.stringify({
              error: 'storage_full',
              capacity: {
                budgetBytes: 400000000,
                usedBytes: 380000000,
                reserveBytes: 57800000,
              },
            })
          : '{"error":"chart_source_not_found"}',
    });
  });
  await page.goto('/select/');
  await page.click('#add-youtube');
  await page.fill(
    '#youtube-url',
    'https://www.youtube.com/watch?v=AAAAAAAAAAA',
  );
  await page.click('#youtube-submit');
  const row = page.locator('[data-pending-video="AAAAAAAAAAA"]');
  await expect(row).toHaveAttribute('data-state', 'error');
  for (const language of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    await page.evaluate((l) => {
      const s = JSON.parse(localStorage.getItem('orvio.settings.v1')!);
      s.language = l;
      s.languageMode = 'manual';
      localStorage.setItem('orvio.settings.v1', JSON.stringify(s));
    }, language);
    await page.reload();
    await expect(row).toContainText(AUDIO_STORAGE_FULL[language]);
  }
  expect(requests.filter((r) => r.method === 'POST')).toHaveLength(1);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('orvio.settings.v1')!);
    s.language = 'ko';
    s.languageMode = 'manual';
    localStorage.setItem('orvio.settings.v1', JSON.stringify(s));
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath('capacity-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath('capacity-mobile.png'),
    fullPage: true,
  });
});
