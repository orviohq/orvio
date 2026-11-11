import { expect, test, type BrowserContext } from '@playwright/test';
const LOCAL_ORIGIN = 'http://127.0.0.1:4186';
async function blockForeign(context: BrowserContext) {
  const foreign: string[] = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === LOCAL_ORIGIN) return route.continue();
    foreign.push(url.href);
    await route.abort('blockedbyclient');
  });
  return foreign;
}
test('opens the prefilled Add dialog and consumes the invitation without enqueueing', async ({
  page,
  context,
}) => {
  const foreign = await blockForeign(context);
  await page.goto('/select/?youtube=dQw4w9WgXcQ');
  const dialog = page.locator('#youtube-import');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#youtube-url')).toHaveValue(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.has('youtube'))
    .toBe(false);
  expect(new URL(page.url()).pathname).toBe('/select/');
  await expect(page.locator('.import-pending')).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem('orvio.pending-imports.v1')),
  ).toBeNull();
  await page.waitForTimeout(500);
  await expect(page.locator('.import-pending')).toHaveCount(0);
  expect(foreign).toEqual([]);
});
test('does not open the Add dialog for an invalid invitation', async ({
  page,
  context,
}) => {
  const foreign = await blockForeign(context);
  await page.goto('/select/?youtube=bad');
  await page.waitForFunction(() => !!(window as any).orvioDiagnostics);
  await page.waitForFunction(
    () => !document.documentElement.dataset.libraryHydrating,
  );
  await page.waitForTimeout(300);
  await expect(page.locator('#youtube-import')).not.toBeVisible();
  expect(foreign).toEqual([]);
});
