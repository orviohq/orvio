import { test, expect } from '@playwright/test';
import fs from 'node:fs';
for (const width of [1440, 979, 390, 320])
  test(`failed and retry cards share library artwork and type ${width}`, async ({
    browser,
  }) => {
    const c = await browser.newContext({
      viewport: { width, height: width < 500 ? 844 : 1000 },
      locale: 'ko-KR',
      serviceWorkers: 'block',
    });
    const p = await c.newPage();
    const errors: string[] = [],
      effects: string[] = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    p.on('request', (r) => {
      if (r.method() !== 'GET') effects.push(r.url());
    });
    await p.addInitScript(() => {
      if (sessionStorage.getItem('orv73-seeded')) return;
      sessionStorage.setItem('orv73-seeded', 'true');
      localStorage.setItem(
        'orvio.pending-imports.v1',
        JSON.stringify([
          {
            videoId: 'AAAAAAAAAAA',
            jobId: 'failedJob',
            title:
              '실리카겔 (Silica Gel) - T + Tik Tak Tok (feat. So!YoON!) [MV]',
            state: 'error',
            error: 'storage_full',
          },
          {
            videoId: 'BBBBBBBBBBB',
            jobId: 'otherJob',
            title: '다른 곡 오류도 같은 카드 Another song with a long title',
            state: 'error',
            error: 'unavailable',
          },
        ]),
      );
    });
    await p.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
      r.fulfill({
        status: 404,
        body: '{}',
        headers: { 'Access-Control-Allow-Origin': '*' },
      }),
    );
    await p.route('https://i.ytimg.com/**', (r) =>
      r.fulfill({
        contentType: 'image/png',
        body: fs.readFileSync('public/wallpapers/first-light.png'),
      }),
    );
    await p.goto('/select/');
    await p.waitForFunction(() => !!(window as any).orvioDiagnostics);
    const normal = p.locator('#songs>[data-song="0"]');
    const metrics = (e: any) =>
      e.evaluate((n: HTMLElement) => {
        const s = getComputedStyle(n),
          a = n.querySelector('.cover')!.getBoundingClientRect(),
          t = getComputedStyle(n.querySelector('strong')!);
        return {
          padding: s.padding,
          columnGap: s.columnGap,
          radius: s.borderRadius,
          width: a.width,
          height: a.height,
          title: t.fontSize,
          lineHeight: t.lineHeight,
        };
      });
    const rows = p.locator('.import-pending[data-state=error]');
    await expect(rows).toHaveCount(2);
    for (const row of await rows.all()) {
      expect(await metrics(row)).toEqual(await metrics(normal));
      await expect(row.locator('[role=status]')).not.toBeEmpty();
      await expect(row.locator('img')).toBeVisible();
      await expect(row.locator('button')).toHaveCount(2);
      await expect(row).not.toHaveAttribute('aria-busy', 'true');
      const bounds = await row.evaluate((n) => ({
        width: n.clientWidth,
        scroll: n.scrollWidth,
      }));
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
    }
    await rows.first().scrollIntoViewIfNeeded();
    await p.screenshot({
      path: test.info().outputPath(`orv73-error-${width}.png`),
    });
    const title = await rows.first().locator('strong').textContent();
    await rows.first().locator('.import-retry').click();
    await expect(p.locator('#youtube-url')).toHaveValue(
      'https://www.youtube.com/watch?v=AAAAAAAAAAA',
    );
    await p.keyboard.press('Escape');
    await expect(rows.first().locator('strong')).toHaveText(title!);
    await rows.first().locator('.import-dismiss').click();
    await expect(rows).toHaveCount(1);
    await p.reload();
    await expect(rows).toHaveCount(1);
    expect(errors).toEqual([]);
    expect(effects).toEqual([]);
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await c.close();
  });
