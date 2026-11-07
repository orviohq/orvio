import { test, expect, type Page } from '@playwright/test';
async function dragText(page: Page, selector: string) {
  console.log('drag', selector);
  const box = await page.locator(selector).first().boundingBox();
  expect(box).toBeTruthy();
  await page.evaluate(() => getSelection()?.removeAllRanges());
  await page.mouse.move(box!.x + 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + Math.min(box!.width - 2, 160),
    box!.y + box!.height / 2,
    { steps: 20 },
  );
  await page.mouse.up();
  expect(await page.evaluate(() => getSelection()?.toString() || '')).toBe('');
}
test('real mouse cannot select text in home, selection, options, settings, pause, about and results; controls still work', async ({
  page,
}) => {
  await page.goto('/');
  await dragText(page, '#home-start');
  console.log('select');
  await page.goto('/select/');
  await dragText(page, '#selected-title');
  await page.click('#open-settings');
  await dragText(page, '#settings h2');
  const volume = page.locator('#volume');
  const box = (await volume.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
  expect(Number(await volume.inputValue())).toBeLessThan(0.5);
  await page.locator('#settings .close').click();
  await page.click('#about-button');
  await dragText(page, '#about p');
  await page.locator('#about .close').click();
  await page.keyboard.press('F3');
  await dragText(page, '#game-options h2');
  await page.keyboard.press('Escape');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.keyboard.press('Escape');
  await dragText(page, '#pause h2');
  await page.click('#pause-exit');
  const p = new URLSearchParams({
    v: '1',
    song: 'first-light',
    keys: '5',
    diff: 'low',
    score: '0',
    acc: '0',
    combo: '0',
  });
  await page.goto('/result/#' + p);
  await dragText(page, '#result-song');
  await dragText(page, '#result-score');
  await dragText(page, '#judgment-list');
  await page.screenshot({ path: 'test-results/012-no-selection-results.png' });
});
