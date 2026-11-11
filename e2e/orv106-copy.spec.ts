import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

for (const [name, width, height] of [
  ['desktop', 1280, 900],
  ['mobile', 390, 844],
] as const) {
  test(`English game information ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      localStorage.setItem('orvio.settings.v1', JSON.stringify({
        language: 'en', languageMode: 'manual',
      }));
    });
    await page.goto('/select/');
    await page.locator('#about-button').click();
    const about = page.locator('#about');
    await expect(about).toBeVisible();
    for (const text of ['4', '5', '6', '7', '8', 'YouTube', 'browser library']) {
      await expect(about).toContainText(text);
    }
    await expect(about).toContainText('Built-in original tracks');
    await expect(about).toContainText('hold long notes to the end');
    await mkdir('.orv106-evidence', { recursive: true });
    await page.screenshot({ path: `.orv106-evidence/about-${name}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const bounds = await about.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  });
}
