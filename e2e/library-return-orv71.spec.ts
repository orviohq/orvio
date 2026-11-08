import { test, expect } from '@playwright/test';
for (const viewport of [
  { width: 1440, height: 650 },
  { width: 390, height: 844 },
])
  test(`selected song return ${viewport.width}`, async ({ browser }) => {
    const c = await browser.newContext({
        viewport,
        serviceWorkers: 'block',
        locale: 'ko-KR',
      }),
      p = await c.newPage();
    const errors: string[] = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto('/select/');
    await p.locator('[data-song="2"]').click();
    await p.locator('[data-song="2"]').scrollIntoViewIfNeeded();
    await p.waitForTimeout(200);
    const state = await p.evaluate(() =>
      localStorage.getItem('orvio.library-selection.v1'),
    );
    expect(state).toContain('violet');
    const visible = async () =>
      p.locator('#songs>.song-card.selected').evaluate((e) => {
        const r = e.getBoundingClientRect(),
          list = document.querySelector('#songs')!,
          b = list.getBoundingClientRect();
        return {
          selected: e.getAttribute('data-song'),
          visible:
            r.top >= Math.max(0, b.top) - 1 &&
            r.bottom <= Math.min(innerHeight, b.bottom) + 1,
        };
      });
    expect((await visible()).visible).toBe(true);
    await p.click('#open-replays');
    await expect(p).toHaveURL(/replays/);
    await p.goBack();
    await expect(p.locator('#lobby')).toBeVisible();
    await expect.poll(async () => (await visible()).visible).toBe(true);
    expect((await visible()).selected).toBe('2');
    await p.screenshot({
      path: `/downloads/orv71-return-${viewport.width}.png`,
    });
    await p.reload();
    await expect.poll(async () => (await visible()).visible).toBe(true);
    expect((await visible()).selected).toBe('2');
    await p.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    });
    expect((await visible()).visible).toBe(true);
    expect(errors).toEqual([]);
    await c.close();
  });
