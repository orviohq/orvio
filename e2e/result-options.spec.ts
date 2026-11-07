import { test, expect } from '@playwright/test';
test('shared v4 result retry really shows the recorded chart and options', async ({
  page,
}) => {
  await page.goto(
    '/result/#v=4&song=afterimage&keys=7&diff=high&score=500000&acc=50&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1&speed=9&shuffle=random&fade=out2&seed=123',
  );
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#result-song')).toHaveText('Afterimage');
  await expect(page.locator('.result-option-keys')).toHaveAttribute(
    'aria-label',
    'KEY 7',
  );
  await expect(page.locator('#result-options')).toContainText('9.0');
  await expect(page.locator('.result-option-shuffle')).toHaveAttribute(
    'aria-label',
    /RANDOM/,
  );
  await page.click('#retry');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#home-screen')).toBeHidden();
  expect(
    await page.evaluate(() => {
      const d = (window as any).orvioDiagnostics;
      return {
        song: d.song,
        lanes: d.settings.lanes,
        difficulty: d.settings.difficulty,
        speed: d.settings.speed,
        shuffle: d.settings.shuffle,
        fader: d.settings.fader,
        seed: d.settings.shuffleSeed,
      };
    }),
  ).toEqual({
    song: 'afterimage',
    lanes: 7,
    difficulty: 'high',
    speed: 9,
    shuffle: 'random',
    fader: 'out2',
    seed: 123,
  });
});
