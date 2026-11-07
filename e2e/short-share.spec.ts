import { test, expect } from '@playwright/test';
import { mockShare } from './share-mock';
const fragment =
  'v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1';
test('only explicit share sends data; short URL copies once and opens same result; cached re-share avoids writes', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const mock = await mockShare(context);
  await page.goto('/result/#' + fragment);
  await expect(page.locator('#results')).toBeVisible();
  expect(mock.requests).toHaveLength(0);
  await page.click('#share-result');
  await expect(page.locator('#toast')).toHaveText('링크를 복사했어요');
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/result\/\?s=[A-Za-z0-9_-]{20,100}$/);
  expect(url.length).toBeLessThan(100);
  expect(mock.requests).toHaveLength(1);
  await page.click('#share-result');
  expect(mock.requests).toHaveLength(1);
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.locator('#results')).toBeVisible();
  await expect(other.locator('#result-score')).toHaveText('500,000');
  expect(mock.requests.map((r) => r.method)).toEqual(['POST', 'GET']);
});
test('quota never overwrites clipboard with long link, expired/malformed short record cannot play', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
    r.fulfill({
      status: r.request().method() === 'POST' ? 429 : 404,
      json: { error: 'quota_or_missing' },
    }),
  );
  await page.goto('/result/#' + fragment);
  await page.evaluate(() => navigator.clipboard.writeText('unchanged'));
  await page.click('#share-result');
  await expect(page.locator('#share-status')).toContainText('무료 공유 한도');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'unchanged',
  );
  await page.goto('/result/?s=missing000000000000000000');
  await expect(page.locator('.share-error')).toContainText('만료');
  await expect(page.locator('#watch-replay')).toBeHidden();
  await context.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
    r.fulfill({
      json: {
        fragment: fragment + '&rp=1&rn=200',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    }),
  );
  await page.goto('/result/?s=bad000000000000000000000');
  await expect(page.locator('.share-error')).toContainText('손상');
});
