import { test, expect } from '@playwright/test';
test('all dropdowns use the same custom list with keyboard, focus and bounded popovers', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.keyboard.press('F2');
  await expect(page.locator('#language')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await page.click('#language-trigger');
  await expect(page.locator('#language-menu')).toBeVisible();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.locator('#language')).toHaveValue('vi');
  await expect(page.locator('#language-trigger')).toBeFocused();
  await page.click('#language-trigger');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('F3');
  for (const id of ['speed', 'fader', 'shuffle']) {
    await expect(page.locator('#' + id)).toHaveAttribute('aria-hidden', 'true');
    await page.click('#' + id + '-trigger');
    await expect(page.locator('#' + id + '-menu')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.screenshot({ path: 'test-results/custom-options.png' });
  await page.keyboard.press('Escape');
  for (const [w, h] of [
    [320, 568],
    [768, 480],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.keyboard.press('F2');
    await page.click('#language-trigger');
    expect(
      await page.locator('#language-menu').evaluate((e) => {
        const r = e.getBoundingClientRect();
        return (
          r.top >= 0 &&
          r.left >= 0 &&
          r.bottom <= innerHeight &&
          r.right <= innerWidth
        );
      }),
    ).toBe(true);
    await page.screenshot({ path: `test-results/custom-language-${w}.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
  }
  await page.goto('/patch-notes/');
  await expect(page.locator('#patch-language')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await page.click('#patch-language-trigger');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.screenshot({ path: 'test-results/custom-patch-language.png' });
});

test('translated dropdowns remain in viewport and synchronize programmatic values', async ({
  page,
}) => {
  const { LANGUAGES } = await import('../src/i18n');
  for (const [width, height] of [
    [320, 568],
    [768, 480],
    [1280, 480],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/select/');
    for (const lang of Object.keys(LANGUAGES)) {
      await page.keyboard.press('F2');
      await page.selectOption('#language', lang);
      await page.click('#language-trigger');
      await expect(page.locator('#language-menu')).toBeVisible();
      expect(
        await page.locator('#language-menu').evaluate((e) => {
          const r = e.getBoundingClientRect();
          return (
            r.top >= 0 &&
            r.left >= 0 &&
            r.bottom <= innerHeight &&
            r.right <= innerWidth
          );
        }),
      ).toBe(true);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.keyboard.press('F3');
      for (const id of ['speed', 'fader', 'shuffle']) {
        await page.click('#' + id + '-trigger');
        expect(
          await page.locator('#' + id + '-menu').evaluate((e) => {
            const r = e.getBoundingClientRect();
            return (
              r.top >= 0 &&
              r.left >= 0 &&
              r.bottom <= innerHeight &&
              r.right <= innerWidth
            );
          }),
          `${lang} ${id} ${width}`,
        ).toBe(true);
        await page.keyboard.press('Escape');
      }
      await page.keyboard.press('Escape');
    }
  }
});
