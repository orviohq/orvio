import { test, expect } from '@playwright/test';
const languages = ['ko', 'en', 'de', 'fr', 'ru', 'vi', 'ja', 'zh'];
test('A31 actions and settings remain readable and reachable across narrow and long locales', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/select/');
    await expect(page.locator('#remove-song')).toHaveCount(0);
    await expect(page.locator('.library .section-title>span')).toHaveCount(0);
    await expect(page.locator('.under-start>span')).toHaveCount(1);
    await page.keyboard.press('F2');
    for (const lang of languages) {
      await page.selectOption('#language', lang);
      await expect(page.locator('#settings')).toBeVisible();
      expect(
        await page
          .locator('#settings')
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        `${lang} ${width} settings`,
      ).toBe(true);
      const sizes = await page
        .locator('#settings label,#settings #reset,#settings .select-trigger')
        .evaluateAll((es) =>
          es
            .filter((e) => e.getBoundingClientRect().height)
            .map((e) => ({
              text: e.textContent,
              size: parseFloat(getComputedStyle(e).fontSize),
            })),
        );
      expect(
        sizes.every((x) => x.size >= 14),
        JSON.stringify(sizes),
      ).toBe(true);
      await page.locator('#reset').scrollIntoViewIfNeeded();
      await expect(page.locator('#reset')).toBeInViewport();
      if (['ko', 'de'].includes(lang))
        await page.screenshot({
          path: `/downloads/a31-settings-${lang}-${width}.png`,
        });
    }
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.keyboard.press('F3');
    expect(
      await page
        .locator('#game-options')
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await page.locator('#options-done').scrollIntoViewIfNeeded();
    await expect(page.locator('#options-done')).toBeInViewport();
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    for (const lang of ['en', 'ko', 'de']) {
      await page.evaluate((l) => {
        Object.defineProperty(navigator, 'languages', {
          get: () => [l],
          configurable: true,
        });
        window.dispatchEvent(new Event('languagechange'));
      }, lang);
      // Switch the remembered manual locale through the preserved settings model.
      await page.evaluate((l) => {
        const s = document.querySelector<HTMLSelectElement>('#language')!;
        s.value = l;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }, lang);
      await page.locator('#retry').scrollIntoViewIfNeeded();
      await expect(page.locator('#retry')).toBeInViewport();
      expect(
        await page
          .locator('#retry')
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(20);
      expect(
        await page
          .locator('#results')
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      await page.screenshot({
        path: `/downloads/a31-result-${lang}-${width}.png`,
      });
    }
  }
  expect(errors).toEqual([]);
});
