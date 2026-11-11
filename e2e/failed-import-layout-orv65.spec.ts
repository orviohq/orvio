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
    await p.route('**/src/prepare-direct-allkeys.ts*', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `
        import { AudioJobError } from '/src/external-audio-api.ts';
        export function prepareDirectAllKeys() {
          return new Promise((_resolve, reject) => {
            window.__orv65FailRetry = () => reject(new AudioJobError('request_timeout'));
          });
        }
      `,
    }));
    await p.goto('/select/');
    const row = p.locator('.import-pending[data-import-video="AAAAAAAAAAA"]');
    await expect(row).toBeVisible();
    await expect(row.locator('img')).toBeVisible();
    const { rect, children } = await row.evaluate((el) => {
      const selectors = [
        '.import-retry',
        '.import-dismiss',
        '.song-copy strong',
        '.cover',
      ];
      const toBox = (r: DOMRect) => ({
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      });
      return {
        rect: toBox(el.getBoundingClientRect()),
        children: selectors.map((selector) => {
          const child = el.querySelector(selector);
          return child ? toBox(child.getBoundingClientRect()) : null;
        }),
      };
    });
    for (const b of children) {
      expect(b!.x).toBeGreaterThanOrEqual(rect.x);
      expect(b!.x + b!.width).toBeLessThanOrEqual(rect.x + rect.width + 1);
      expect(b!.y + b!.height).toBeLessThanOrEqual(rect.y + rect.height + 1);
    }
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.screenshot({
      path: test.info().outputPath(`orv65-independent-${width}.png`),
    });
    await row.locator('.import-retry').click();
    await expect(p.locator('#youtube-import')).not.toBeVisible();
    await expect(row).toHaveAttribute('data-state', 'loading');
    await expect(row).toHaveAttribute('aria-busy', 'true');
    await expect(row).toHaveClass(/import-shine/);
    await p.waitForFunction(() => !!(window as any).__orv65FailRetry);
    await p.evaluate(() => (window as any).__orv65FailRetry());
    await expect(row).toHaveAttribute('data-state', 'error');
    expect(mutations).toEqual([]);
    await row.locator('.import-dismiss').click();
    await expect(row).toHaveCount(0);
    await p.reload();
    await expect(row).toHaveCount(0);
    expect(mutations).toEqual([]);
    await c.close();
  });
