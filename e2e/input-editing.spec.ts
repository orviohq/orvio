import { test, expect } from '@playwright/test';
test('YouTube input supports Meta+A, Ctrl+A, caret editing, and selection without game input', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.click('#add-youtube');
  const input = page.locator('#youtube-url'),
    text = 'https://www.youtube.com/watch?v=I_DocC3srzY';
  await input.fill(text);
  await input.focus();
  await input.press('Meta+a');
  expect(
    await input.evaluate((e: HTMLInputElement) => [
      e.selectionStart,
      e.selectionEnd,
    ]),
  ).toEqual([0, text.length]);
  await input.press('Backspace');
  await expect(input).toHaveValue('');
  await input.fill(text);
  await input.press('Control+a');
  expect(
    await input.evaluate((e: HTMLInputElement) => [
      e.selectionStart,
      e.selectionEnd,
    ]),
  ).toEqual([0, text.length]);
  await input.press('ArrowRight');
  await input.press('ArrowLeft');
  await input.press('Shift+ArrowLeft');
  expect(
    await input.evaluate(
      (e: HTMLInputElement) => e.selectionEnd! - e.selectionStart!,
    ),
  ).toBe(1);
  expect(await input.evaluate((e) => getComputedStyle(e).userSelect)).toBe(
    'text',
  );
  expect(
    await input.evaluate((e) =>
      e.dispatchEvent(
        new Event('selectstart', { bubbles: true, cancelable: true }),
      ),
    ),
  ).toBe(true);
  const intercepted = await input.evaluate((e) => {
    const k = new KeyboardEvent('keydown', {
      code: 'KeyD',
      key: 'd',
      isComposing: true,
      bubbles: true,
      cancelable: true,
    });
    return !e.dispatchEvent(k);
  });
  expect(intercepted).toBe(false);
  await page.screenshot({
    path:
      process.env.ORVIO_EDITING_SCREENSHOT ?? 'test-results/input-editing.png',
  });
});
