import { test, expect } from '@playwright/test';
import fs from 'node:fs';

/**
 * A29: the deferred boot route for a shared result must not dismiss a dialog
 * the user opened while that route was still resolving. Covers the three
 * `?s=` resolution branches:
 *  - default fragment success (`readRoute(false, preserveDialogs)`)
 *  - share error (`readRoute(false, preserveDialogs)` in the catch path)
 *  - v5/v6 success (`openExternalShare(fragment, preserveDialogs)`)
 *
 * Real share behaviour is asserted alongside preservation: the result (or the
 * share-error notice) must still render and the URL must resolve. Only the
 * settings dialog's open state is the regression under test.
 */

const fragment =
  'v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1';
const v5 = JSON.parse(
  fs.readFileSync('e2e/fixtures/progressive-browser.json', 'utf8'),
).fragment as string;

async function openSettingsWhilePending(page: import('@playwright/test').Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.hasAttribute('data-result-pending'),
      ),
    )
    .toBe(true);
  await page.keyboard.press('F2');
  await expect
    .poll(() =>
      page.locator('#settings').evaluate((e) => (e as HTMLDialogElement).open),
    )
    .toBe(true);
}

for (const [branch, body, status] of [
  ['default fragment success', fragment, 200],
  ['share error', '', 404],
  ['v5/v6 openExternalShare', v5, 200],
] as const) {
  test(`survives ${branch} while the deferred boot route resolves`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 900, height: 800 },
    });
    const page = await context.newPage();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    await context.route(
      'https://orvio-share.pn-26f.workers.dev/**',
      async (route) => {
        await hold;
        await route.fulfill({
          status,
          json:
            status === 200
              ? {
                  fragment: body,
                  expiresAt: new Date(Date.now() + 86400000).toISOString(),
                }
              : { error: 'not_found' },
        });
      },
    );
    await page.goto(baseURL + '/result/?s=synthetic000000000000000000');
    await openSettingsWhilePending(page);
    release();
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.hasAttribute('data-result-pending'),
        ),
      )
      .toBe(false);
    if (status === 200) {
      await expect(page.locator('#results')).toBeVisible();
      await expect(page.locator('#home-screen')).toBeHidden();
    } else {
      await expect(page.locator('dialog.share-error')).toBeVisible();
    }
    await expect
      .poll(() =>
        page
          .locator('#settings')
          .evaluate((e) => (e as HTMLDialogElement).open),
      )
      .toBe(true);
    await expect(page.locator('#settings')).toBeVisible();
    await context.close();
  });
}

// The typed-cause assertions below cover the accompanying share-error
// classification that the three-branch preservation routes share.
test('typed share failure keeps the accurate cause', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await context.route('https://orvio-share.pn-26f.workers.dev/**', (route) =>
    route.abort('failed'),
  );
  await page.goto(baseURL + '/result/?s=synthetic000000000000000000');
  await expect(page.locator('dialog.share-error p')).toHaveText(
    '공유 링크를 불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.',
  );
  await context.close();
});

test('typed quota failure keeps the accurate cause', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await context.route('https://orvio-share.pn-26f.workers.dev/**', (route) =>
    route.fulfill({ status: 429, json: { error: 'rate_limited' } }),
  );
  await page.goto(baseURL + '/result/?s=synthetic000000000000000000');
  await expect(page.locator('dialog.share-error p')).toHaveText(
    '공유하지 못했어요. 링크를 복사하지 않았어요. 나중에 다시 시도해주세요.',
  );
  await context.close();
});
