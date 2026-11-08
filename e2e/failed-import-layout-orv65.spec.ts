import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const width of [1440, 979, 390, 320])
  test(`failed row responsive actions and safe retry ${width}`, async ({
    browser,
  }) => {
    const c = await browser.newContext({
      viewport: { width, height: width < 500 ? 844 : 1000 },
      locale: 'ko-KR',
      serviceWorkers: 'block',
    });
    const p = await c.newPage();
    let mutations: string[] = [];
    p.on('request', (r) => {
      if (r.method() !== 'GET') mutations.push(r.url());
    });
    await p.addInitScript(() => {
      if (!localStorage.getItem('orv65seed')) {
        localStorage.setItem('orv65seed', '1');
        localStorage.setItem(
          'orvio.pending-imports.v1',
          JSON.stringify([
            {
              videoId: 'AAAAAAAAAAA',
              title:
                'I have you only (My love X Nerd Connection) (그대만 있다면 여름날 우리 X 너드커넥션) 아주 긴 제목 테스트',
              state: 'error',
              error: 'provider_failed',
            },
          ]),
        );
      }
    });
    await p.route('https://i.ytimg.com/**', (r) =>
      r.fulfill({
        contentType: 'image/png',
        body: fs.readFileSync('public/wallpapers/first-light.png'),
      }),
    );
    await p.goto('/select/');
    const row = p.locator('.import-pending[data-state=error]');
    await expect(row).toBeVisible();
    await expect(row.locator('img')).toBeVisible();
    const rect = await row.boundingBox();
    for (const e of [
      '.import-retry',
      '.import-dismiss',
      '.song-copy strong',
      '.cover',
    ]) {
      const b = await row.locator(e).boundingBox();
      expect(b!.x).toBeGreaterThanOrEqual(rect!.x);
      expect(b!.x + b!.width).toBeLessThanOrEqual(rect!.x + rect!.width + 1);
      expect(b!.y + b!.height).toBeLessThanOrEqual(rect!.y + rect!.height + 1);
    }
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.screenshot({ path: `/downloads/orv65-independent-${width}.png` });
    await row.locator('.import-retry').click();
    await expect(p.locator('#youtube-import')).toBeVisible();
    await expect(p.locator('#youtube-url')).toHaveValue(
      'https://www.youtube.com/watch?v=AAAAAAAAAAA',
    );
    await p.locator('#youtube-cancel').click();
    expect(mutations).toEqual([]);
    await row.locator('.import-dismiss').click();
    await expect(row).toHaveCount(0);
    await p.reload();
    await expect(row).toHaveCount(0);
    expect(mutations).toEqual([]);
    await c.close();
  });
