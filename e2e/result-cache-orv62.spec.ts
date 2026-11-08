import { test, expect } from '@playwright/test';
import { mockShare } from './share-mock';
const fragment =
  'v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1';

test('ORV-62: shared result renders instantly from the persistent query cache on reload, no second GET', async ({
  page,
  context,
}) => {
  const mock = await mockShare(context);
  const id = 'replay000000000000000062';
  mock.records.set(id, fragment);
  const coldStart = Date.now();
  await page.goto('/result/?s=' + id);
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('500,000');
  const coldMs = Date.now() - coldStart;
  expect(mock.requests.map((r) => r.method)).toEqual(['GET']);

  // Re-open the short link itself (a reload after the render uses the
  // local fragment URL, which never fetched even before ORV-62).
  const warmStart = Date.now();
  await page.goto('/result/?s=' + id);
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('500,000');
  const warmMs = Date.now() - warmStart;
  // The warm reload must not touch the network for the replay at all.
  expect(mock.requests).toHaveLength(1);
  console.log(`ORV62 result cold=${coldMs}ms warm=${warmMs}ms`);
});

test('ORV-62: cached shared result renders while the share service is down', async ({
  page,
  context,
}) => {
  const mock = await mockShare(context);
  const id = 'replay000000000000000063';
  mock.records.set(id, fragment);
  await page.goto('/result/?s=' + id);
  await expect(page.locator('#result-score')).toHaveText('500,000');
  await context.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
    r.abort(),
  );
  await page.goto('/result/?s=' + id);
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-score')).toHaveText('500,000');
  await expect(page.locator('.share-error')).toHaveCount(0);
});

test('ORV-62: expired cached replay never renders; the server-confirmed expiry shows the missing dialog', async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  const id = 'replay000000000000000064';
  // Short-lived record: valid on first load, expired by the reload.
  const expiresAt = new Date(Date.now() + 2500).toISOString();
  await context.route(
    'https://orvio-share.pn-26f.workers.dev/**',
    async (route) => {
      requests.push(route.request().method());
      await route.fulfill({ status: 200, json: { fragment, expiresAt } });
    },
  );
  await page.goto('/result/?s=' + id);
  await expect(page.locator('#result-score')).toHaveText('500,000');
  await page.waitForTimeout(3000);
  await page.goto('/result/?s=' + id);
  // The expired cache entry is discarded, the refetch confirms expiry, and
  // the standard missing-result dialog appears - never stale content.
  await expect(page.locator('.share-error')).toContainText('만료');
  await expect(page.locator('#results')).not.toBeVisible();
  expect(requests).toEqual(['GET', 'GET']);
});
