import { test, expect } from '@playwright/test';
test.use({ locale: 'ko-KR', viewport: { width: 1024, height: 600 } });
const api = 'https://orvio-share.pn-26f.workers.dev';
test('A2 visible waiting, cancel/reopen, failure and retry keep original selection', async ({
  page,
}) => {
  let requests = 0;
  await page.route(api + '/**', async (route) => {
    requests++;
    await new Promise((r) => setTimeout(r, 2200));
    await route
      .fulfill({
        status: 503,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: { code: 'unavailable' } }),
      })
      .catch(() => {});
  });
  await page.goto('/select/');
  const title = await page.locator('#selected-title').textContent();
  await page.click('#add-youtube');
  await page.fill('#youtube-url', 'https://youtu.be/uXn-zOt68V8');
  await page.click('#youtube-submit');
  await expect(page.locator('#youtube-progress')).toBeVisible();
  await expect(page.locator('#youtube-submit')).toBeDisabled();
  await expect(page.locator('#youtube-form')).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await page.waitForTimeout(1100);
  await expect(page.locator('#youtube-elapsed')).toContainText('s');
  await page.screenshot({ path: 'test-results/a2-waiting.png' });
  await page.click('#youtube-cancel');
  await page.click('#add-youtube');
  await expect(page.locator('#youtube-progress')).not.toBeVisible();
  await expect(page.locator('#youtube-submit')).toBeEnabled();
  await page.click('#youtube-submit');
  await expect(page.locator('#youtube-progress')).toBeVisible();
  await expect(page.locator('#youtube-status')).not.toHaveText('', {
    timeout: 10000,
  });
  await expect(page.locator('#youtube-progress')).not.toBeVisible();
  await expect(page.locator('#youtube-submit')).toBeEnabled();
  await expect(page.locator('#youtube-form')).not.toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(page.locator('#selected-title')).toHaveText(title!);
  await page.screenshot({ path: 'test-results/a2-error.png' });
  expect(requests).toBe(2);
});
