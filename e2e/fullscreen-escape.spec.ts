import { test, expect } from '@playwright/test';
test('fullscreen Escape leaves results intact, repeat cannot dismiss, next distinct Escape returns', async ({
  page,
}) => {
  await page.goto(
    '/result/#v=4&song=afterimage&keys=7&diff=high&score=500000&acc=50&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1&speed=9&shuffle=random&fade=out2&seed=123',
  );
  await expect(page.locator('#results')).toBeVisible();
  // Test browser gesture-driven fullscreen, not a mocked property.
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.id = 'test-fullscreen';
    b.textContent = 'fullscreen';
    b.onclick = () => void document.documentElement.requestFullscreen();
    document.querySelector('#results')!.append(b);
  });
  await page.click('#test-fullscreen');
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await page.keyboard.down('Escape');
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false);
  await expect(page.locator('#results')).toBeVisible();
  await page.keyboard.down('Escape');
  await expect(page.locator('#results')).toBeVisible();
  await page.keyboard.up('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('#results')).toBeHidden();
  await expect(page).toHaveURL(/\/select\//);
});
