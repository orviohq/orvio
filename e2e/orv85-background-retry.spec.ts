import { test, expect } from '@playwright/test';

const videoId = 'AAAAAAAAAAA';
const title = 'Verified song <b>title</b>';

for (const metadata of [true, false]) {
  test(`failed import directly resumes with loading UI (metadata=${metadata})`, async ({ page }) => {
    await page.setViewportSize({ width: metadata ? 1280 : 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('orvio.settings.v1', JSON.stringify({ language: 'en', languageMode: 'manual' }));
    });
    await page.route('**/*', (route) => {
      const host = new URL(route.request().url()).hostname;
      return host === '127.0.0.1' || host === 'localhost' ? route.continue() : route.abort();
    });
    await page.route('**/src/prepare-direct-allkeys.ts*', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `
        import { AudioJobError } from '/src/external-audio-api.ts';
        window.__orv85Attempts = 0;
        export async function prepareDirectAllKeys(id, signal, options) {
          window.__orv85Attempts++;
          if (${metadata}) options.onMetadata({ title: ${JSON.stringify(title)} });
          options.onStage('extracting');
          if (window.__orv85Attempts === 1)
            throw new AudioJobError('request_timeout', undefined, undefined, undefined, 'service');
          return new Promise(() => {});
        }
      `,
    }));
    await page.goto(`/select/?youtube=${videoId}`);
    // This checkout confirms the initial shared-link invitation in the add dialog.
    await page.locator('#youtube-submit').click();
    const row = page.locator(`[data-import-video="${videoId}"]`);
    await expect(row).toHaveAttribute('data-state', 'error');
    await expect(row.locator('strong')).toHaveText(metadata ? title : `YouTube · ${videoId}`);
    await expect(row.locator('strong b')).toHaveCount(0);
    await expect(row.getByRole('status')).toContainText('waiting for the audio provider');
    await expect(row.getByRole('status')).toContainText('No new request is sent automatically.');
    await expect(page.locator('#youtube-import')).not.toBeVisible();
    await row.evaluate((element) => { (window as any).__orv85Row = element; });
    // A stale second click must not start a second retry after synchronous repaint.
    await row.locator('.import-retry').evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect(row).toHaveAttribute('data-state', 'loading');
    await expect(row).toHaveAttribute('aria-busy', 'true');
    await expect(row).toHaveClass(/import-shine/);
    await expect(row).not.toHaveAttribute('data-import-error');
    await expect(row.locator('.import-retry')).toHaveCount(0);
    await expect(row.locator('strong')).toHaveText(metadata ? title : `YouTube · ${videoId}`);
    await expect(page.locator('#youtube-import')).not.toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).__orv85Attempts)).toBe(2);
    expect(await row.evaluate((element) => element === (window as any).__orv85Row)).toBe(true);
    await expect(row.getByRole('status')).toHaveText('Preparing the audio…');
    await page.screenshot({ path: test.info().outputPath('retry-loading.png') });
    expect(await page.evaluate(() => (window as any).__orv85Attempts)).toBe(2);
  });
}
