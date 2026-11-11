import { test, expect } from '@playwright/test';

for(const width of [1280,390])test('current-app music-list difficulty layout pixels '+width, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/select/');

  await expect(page.locator('#add-youtube')).toBeVisible();
  const row = page.locator('#songs>.song-card[data-song]').first();
  await expect(row).toBeVisible();
  await expect(page.locator('#difficulty button')).toHaveText(['NM', 'HD', 'MX', 'SC']);

  const colors = {
    low: 'rgb(105,197,255)',
    mid: 'rgb(245,216,91)',
    high: 'rgb(255,115,125)',
    sc: 'rgb(199,154,255)',
  };
  for (const [difficulty, color] of Object.entries(colors)) {
    const button = page.locator(`#difficulty button[data-diff="${difficulty}"]`);
    await expect.poll(async () => {
      const computed = await button.evaluate((element) => getComputedStyle(element).color);
      return computed.replace(/\s+/g, '');
    }).toBe(color);
  }

  await expect(row.locator('.song-level')).toHaveText(/^(?:\d+|--)$/);
  await expect(row.locator('.song-duration')).toHaveText(/^\d+:[0-5]\d$/);

  const copyBox = await row.locator('.song-copy').boundingBox();
  const levelBox = await row.locator('.song-level').boundingBox();
  const songsBox = await page.locator('#songs').boundingBox();
  const difficultyBox = await page.locator('#difficulty').boundingBox();
  expect(copyBox).not.toBeNull();
  expect(levelBox).not.toBeNull();
  expect(songsBox).not.toBeNull();
  expect(difficultyBox).not.toBeNull();
  expect(levelBox!.x).toBeGreaterThanOrEqual(copyBox!.x + copyBox!.width);
  expect(difficultyBox!.y).toBeGreaterThanOrEqual(songsBox!.y + songsBox!.height);

  await page.screenshot({ path: `/downloads/orv89-combined0314-${width}-0158.png`, fullPage: true });
});
