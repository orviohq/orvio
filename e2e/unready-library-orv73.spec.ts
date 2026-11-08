import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const width of [1440, 390])
  test(`retained but unready library card preserves controls ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
      r.fulfill({
        status: 404,
        body: '{}',
        headers: { 'Access-Control-Allow-Origin': '*' },
      }),
    );
    await page.goto('/select/');
    const raw = JSON.parse(
      fs.readFileSync('tests/fixtures/a16-server-response.json', 'utf8'),
    ).recordBody;
    await page.evaluate(async (raw) => {
      const { pinSource } = await import(
        /* @vite-ignore */ String('/src/external-source-store.ts')
      );
      await pinSource(JSON.parse(raw));
    }, raw);
    await page.reload();
    const row = page.locator('.canonical-pending');
    await expect(row).toBeVisible();
    await expect(row.locator('.cover img')).toHaveCount(1);
    await expect(row.locator('.import-actions button')).toHaveCount(3);
    expect(
      await row
        .locator('.cover')
        .evaluate((n) => n.getBoundingClientRect().width),
    ).toBe(width === 390 ? 112 : 144);
    expect(await row.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(
      true,
    );
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/downloads/orv73-unready-${width}.png` });
  });
