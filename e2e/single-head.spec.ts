import { test, expect } from '@playwright/test';
test('full dense high-speed chart keeps exactly one head and no generated note trail', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/play/first-light/7/high/?speed=9');
  await page.evaluate(async () => {
    const { Playfield } = await import(
      /* @vite-ignore */ String('/src/renderer.ts')
    );
    const draw = Playfield.prototype.draw;
    (window as any).singleHeadFrames = [];
    Playfield.prototype.draw = function (...args: Parameters<typeof draw>) {
      const result = draw.apply(this, args);
      const self = this as any;
      (window as any).singleHeadFrames.push({
        time: args[2],
        count: self.noteSprites.length,
        visible: self.noteSprites.filter((v: any) => v.head.visible).length,
        extra: self.noteSprites.some((v: any) => 'exposure' in v),
        speed: (window as any).orvioDiagnostics.settings.speed,
      });
      return result;
    };
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.waitForFunction(() => (window as any).orvioAudioTime > 18, {
    timeout: 25000,
  });
  await page.screenshot({ path: '/downloads/orvio-no-shutter-dense.png' });
  await expect(page.locator('#results')).toBeVisible({ timeout: 25000 });
  const samples = await page.evaluate(() => (window as any).singleHeadFrames);
  expect(samples.length).toBeGreaterThan(500);
  expect(samples.some((x: any) => x.time > 30)).toBe(true);
  expect(samples.some((x: any) => x.visible >= 3)).toBe(true);
  expect(
    samples.every(
      (x: any) => !x.extra && x.speed === 9 && x.count === samples[0].count,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.score),
  ).toBe(0);
});
