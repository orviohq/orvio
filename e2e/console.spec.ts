import { heldBindingCodes } from './hold-input';
import { atKey } from './input';
import { judge } from '../src/engine';
import { test, expect } from '@playwright/test';
test('keyboard-only track, difficulty, lanes, settings, locales, start and exit', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-song="1"]')).toHaveClass(/selected/);
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.previewActive,
  );
  expect(
    await page.evaluate(
      () => (window as any).orvioDiagnostics.audioContextState,
    ),
  ).toBe('running');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('7');
  await expect(page.locator('[data-diff="mid"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-lanes="7"]')).toHaveClass(/selected/);
  await page.keyboard.press('F2');
  await expect(page.locator('#settings')).toBeVisible();
  // The dialog close button is initially focused. Tab reaches the language menu.
  await page.keyboard.press('Tab');
  await expect(page.locator('#language-trigger')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).not.toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect(
    await page.evaluate(() => (window as any).orvioDiagnostics.previewActive),
  ).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#lobby')).toBeVisible();
});
test('five languages render with local fonts and no page overflow', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.click('#open-settings');
  for (const lang of ['en', 'ko', 'zh', 'ja', 'es']) {
    await page.selectOption('#language', lang);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/options-${lang}.png` });
  }
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/console-es.png' });
});
test('page-timed DOM input gives its measured grade and BREAK feedback with lane effects', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const notes = await page.evaluate(() =>
    (window as any).orvioDiagnostics.notes.map((s: any) => s.note),
  );
  const n = notes[0];
  const keys = (await heldBindingCodes(page)).map((code) =>
    code === 'Space' ? code : code.slice(3).toLowerCase(),
  );
  await atKey(page, n.time, keys[n.lane], true);
  const hit = await page.evaluate(
    (id) =>
      (window as any).orvioDiagnostics.events.find(
        (e: any) => e.noteId === id && !e.tail,
      ),
    n.id,
  );
  expect(hit).toBeTruthy();
  expect(hit.value).toBe(judge(hit.delta));
  expect(hit.value).toBeGreaterThan(0);
  await expect(page.locator('#judge')).toHaveAttribute(
    'data-grade',
    String(hit.value),
  );
  await expect(page.locator('#judge')).toHaveText('MAX ' + hit.value + '%');
  await page.screenshot({ path: 'test-results/measured-hit.png' });
  await page.keyboard.up(keys[n.lane]);
  await expect(page.locator('#judge.break')).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: 'test-results/break-hit.png' });
  expect(
    await page.locator('#judge').evaluate((e) => getComputedStyle(e).color),
  ).toBe('rgb(255, 56, 79)');
  await page.keyboard.press('Escape');
});

test('pause settings resume and page-timed graded key hits remain distinct', async ({
  page,
}) => {
  await page.goto('/select/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  const before = await page.evaluate(
    () => (window as any).orvioDiagnostics.clock,
  );
  await page.keyboard.press('F2');
  await expect(page.locator('#settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  const frozen = await page.evaluate(async () => {
    const a = (window as any).orvioDiagnostics.clock;
    await new Promise((r) => setTimeout(r, 180));
    return [(window as any).orvioDiagnostics.clock, a];
  });
  expect(Math.abs(frozen[0] - frozen[1])).toBeLessThan(0.001);
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.paused === false,
  );
  // Assert the frozen clock while paused, not automation round-trip time after resume.
  expect(before).toBeDefined();
  const notes = await page.evaluate(() =>
    (window as any).orvioDiagnostics.notes.map((s: any) => s.note),
  );
  const keys = (await heldBindingCodes(page)).map((code) =>
    code === 'Space' ? code : code.slice(3).toLowerCase(),
  );
  const colors = new Set<string>();
  for (const [index, delay] of [0, 0.055, 0.085, 0.12].entries()) {
    const n = notes.filter((n: any) => !n.end)[index + 2];
    await atKey(page, n.time + delay, keys[n.lane], true);
    await atKey(page, n.time + delay + 0.002, keys[n.lane], false);
    // Engine input is synchronous; the visible HUD is updated by the next RAF.
    // Read only once the HUD displays this note's actual event, not the previous
    // label's color. Preserve the three-distinct-colors requirement below.
    const color = await page.evaluate(
      (noteId) =>
        new Promise<string>((resolve, reject) => {
          const deadline = performance.now() + 3000;
          function sample() {
            const event = (window as any).orvioDiagnostics.events.find(
              (e: any) => e.noteId === noteId && !e.tail,
            );
            const hud = document.querySelector<HTMLElement>('#judge')!;
            if (event && hud.dataset.grade === String(event.value)) {
              resolve(getComputedStyle(hud).color);
              return;
            }
            if (performance.now() > deadline) {
              reject(new Error('HUD did not display the target note judgment'));
              return;
            }
            requestAnimationFrame(sample);
          }
          sample();
        }),
      n.id,
    );
    colors.add(color);
    await page.screenshot({ path: `test-results/grade-${index}.png` });
  }
  expect(colors.size).toBeGreaterThanOrEqual(3);
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
});
