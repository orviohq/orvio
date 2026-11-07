import { test, expect } from '@playwright/test';
test('patch notes permit real pointer text selection and clipboard copy', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/patch-notes/?lang=ko');
  const paragraph = page.locator('[data-language=ko] article li').first();
  await paragraph.scrollIntoViewIfNeeded();
  const point = await paragraph.evaluate((el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()];
    return {
      start: { x: rects[0].x + 1, y: rects[0].y + rects[0].height / 2 },
      end: { x: rects[0].right - 1, y: rects[0].y + rects[0].height / 2 },
    };
  });
  await page.mouse.move(point.start.x, point.start.y);
  await page.mouse.down();
  await page.mouse.move(point.end.x, point.end.y, { steps: 15 });
  await page.mouse.up();
  const selected = await page.evaluate(
    () => window.getSelection()?.toString() || '',
  );
  expect(selected.length).toBeGreaterThan(5);
  await page.keyboard.press('Control+c');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(selected);
  await page.screenshot({ path: 'test-results/orvio-patch-selection.png' });
});
