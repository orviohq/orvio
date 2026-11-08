import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const width of [1440, 979, 390, 320])
  test(`loading card matches library ${width}`, async ({ browser }) => {
    const c = await browser.newContext({
        viewport: { width, height: width < 500 ? 844 : 1000 },
        locale: 'ko-KR',
        serviceWorkers: 'block',
      }),
      p = await c.newPage();
    const errors: string[] = [],
      effects: string[] = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    p.on('request', (r) => {
      if (r.method() !== 'GET') effects.push(r.url());
    });
    await p.addInitScript(() =>
      localStorage.setItem(
        'orvio.pending-imports.v1',
        JSON.stringify([
          {
            videoId: 'AAAAAAAAAAA',
            jobId: 'mockJob',
            title:
              '아주 긴 제목도 같은 카드에서 읽기 쉽게 표시합니다 Loading song with a long title',
            state: 'loading',
            stage: 'extracting',
          },
        ]),
      ),
    );
    await p.route('https://orvio-share.pn-26f.workers.dev/**', () => {});
    await p.route('https://i.ytimg.com/**', (r) =>
      r.fulfill({
        contentType: 'image/png',
        body: fs.readFileSync('public/wallpapers/first-light.png'),
      }),
    );
    await p.goto('/select/');
    await p.waitForFunction(() => !!(window as any).orvioDiagnostics);
    const row = p.locator('.import-pending[data-state=loading]'),
      normal = p.locator('#songs>[data-song="0"]');
    await expect(row).toBeVisible();
    // Boot may rebuild the list while the same pending job remains active.
    await expect(async () => {
      await row.scrollIntoViewIfNeeded();
      await expect(row).toBeVisible();
    }).toPass({ timeout: 5000 });
    const metrics = async (e: any) =>
      e.evaluate((n: HTMLElement) => {
        const s = getComputedStyle(n),
          a = n.querySelector('.cover')!.getBoundingClientRect();
        return {
          display: s.display,
          padding: s.padding,
          gap: s.gap,
          radius: s.borderRadius,
          width: a.width,
          height: a.height,
          title: getComputedStyle(n.querySelector('strong')!).fontSize,
        };
      });
    expect(await metrics(row)).toEqual(await metrics(normal));
    await expect(row).toHaveAttribute('aria-busy', 'true');
    await expect(row).toHaveAttribute('aria-disabled', 'true');
    await expect(row.locator('[role=status]')).not.toBeEmpty();
    await expect(row.locator('img')).toBeVisible();
    await expect(row.locator('button')).toHaveCount(0);
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.screenshot({ path: `/downloads/orv68-local-${width}.png` });
    await normal.click();
    await expect(p.locator('body')).toHaveClass(/previewing/);
    await p.keyboard.press('Escape');
    expect(await p.locator('#preview-status').textContent()).not.toContain(
      '곡을 선택하면',
    );
    expect(effects).toEqual([]);
    expect(errors).toEqual([]);
    await c.close();
  });
