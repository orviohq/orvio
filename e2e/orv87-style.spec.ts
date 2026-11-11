import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/select/');
  await page.locator('#open-game-options').click();
});

test('game option tooltip has product styles and follows the hovered radio', async ({ page }) => {
  const tooltip = page.locator('#game-option-tooltip');
  const pixel = page.locator('#game-options [data-value=pixel2]');

  await expect(tooltip).toHaveAttribute('hidden', '');
  await expect(tooltip).toHaveCSS('position', 'fixed');
  await expect(tooltip).toHaveCSS('pointer-events', 'none');
  await expect(tooltip).toHaveCSS('display', 'none');

  await pixel.hover();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS('position', 'fixed');
  await expect(tooltip).toHaveCSS('background-color', 'rgb(13, 22, 32)');
  await expect(tooltip).toContainText(/combo|콤보/);
  const before = await tooltip.boundingBox();
  expect(before).not.toBeNull();

  await page.locator('#game-options [data-value=off]').last().hover();
  await expect(tooltip).toBeVisible();
  const after = await tooltip.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.x !== before!.x || after!.y !== before!.y).toBe(true);
});

test('game option tooltip clamps at the viewport right and bottom edges', async ({ page }) => {
  const tooltip = page.locator('#game-option-tooltip');
  const pixel = page.locator('#game-options [data-value=pixel2]');
  const lastRadio = page.locator('#game-options [role=radio]').last();
  const viewport = page.viewportSize()!;

  // Put the last radio at the viewport corner to exercise both clamp branches.
  await page.locator('#game-options').evaluate((dialog) => {
    const radio = dialog.querySelectorAll('[role=radio]');
    const last = radio[radio.length - 1].getBoundingClientRect();
    const rect = dialog.getBoundingClientRect();
    Object.assign(dialog.style, {
      margin: '0',
      right: 'auto',
      bottom: 'auto',
      left: `${rect.left + innerWidth - last.right - 2}px`,
      top: `${rect.top + innerHeight - last.bottom - 2}px`,
    });
  });

  const pixelBox = await pixel.boundingBox();
  expect(pixelBox).not.toBeNull();
  await page.mouse.move(pixelBox!.x + pixelBox!.width - 2, pixelBox!.y + pixelBox!.height / 2);
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(/combo|콤보/);

  const lastBox = await lastRadio.boundingBox();
  expect(lastBox).not.toBeNull();
  const x = lastBox!.x + lastBox!.width - 2;
  const y = lastBox!.y + lastBox!.height - 2;
  expect(x).toBeGreaterThan(viewport.width - 8);
  expect(y).toBeGreaterThan(viewport.height - 8);
  await page.mouse.move(x, y);
  await expect(tooltip).toBeVisible();
  await expect(lastRadio).toHaveAttribute('aria-describedby', 'game-option-tooltip');
  const box = await tooltip.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  expect(box!.x).toBeLessThan(x);
  expect(box!.y + box!.height).toBeLessThan(y);
});

test('game option tooltip shows the pixel2 description on keyboard focus', async ({ page }) => {
  const tooltip = page.locator('#game-option-tooltip');
  const pixel = page.locator('#game-options [data-value=pixel2]');

  await pixel.click();
  await page.keyboard.press('Tab');
  await page.mouse.move(0, 0);
  await expect(pixel).not.toBeFocused();
  await expect(tooltip).toBeHidden();
  await pixel.evaluate((radio: HTMLElement) => radio.focus());
  await expect(pixel).toBeFocused();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(/combo|콤보/);
});
