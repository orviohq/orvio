import { test, expect } from '@playwright/test';
test('collection storage denied shows honest error, never empty or unhandled rejection', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    Object.defineProperty(indexedDB, 'open', {
      value: () => {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  await page.goto('/replays/');
  await expect(page.locator('#replays-empty')).toHaveAttribute(
    'data-state',
    'read-error',
  );
  await expect(page.locator('#replays-empty')).toContainText('읽지 못했습니다');
  await expect(page.locator('#replays-empty')).not.toContainText('없습니다');
  await page.screenshot({
    path: test.info().outputPath('a24-storage-read-error.png'),
  });
  expect(
    (await page.locator('[data-sonner-toast]').allTextContents()).join(''),
  ).not.toContain('음원');
  expect(errors).toEqual([]);
});
