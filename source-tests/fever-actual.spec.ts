import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('actual Orvio FEVER stage progression hold pause finish and exact replay', async ({
  page,
}) => {
  test.setTimeout(110000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/select/?song=violet-drive&lanes=5&difficulty=high');
  await page.click('#open-settings');
  await expect(page.locator('#fever-auto')).toBeChecked();
  await expect(page.locator('#fever-option-label')).toContainText('Orvio');
  await page.screenshot({ path: 'test-results/fever-option.png' });
  await page.keyboard.press('Escape');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  expect(
    (await page.evaluate(() => (window as any).orvioDiagnostics)).fever.metadata
      .rulesId,
  ).toBe('orvio-auto-v1');
  await page.evaluate(() => {
    const w = window as any,
      keys = ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'];
    const queue = w.orvioDiagnostics.notes
      .flatMap((s: any) => [
        { time: s.note.time, code: keys[s.note.lane], down: true },
        {
          time: s.note.end ?? s.note.time + 0.03,
          code: keys[s.note.lane],
          down: false,
        },
      ])
      .sort(
        (a: any, b: any) => a.time - b.time || Number(a.down) - Number(b.down),
      );
    let cursor = 0;
    w.feverAutoplay = true;
    const tick = () => {
      if (!w.feverAutoplay) return;
      const d = w.orvioDiagnostics;
      if (d.active && !d.paused)
        while (
          cursor < queue.length &&
          w.orvioAudioTime >= queue[cursor].time
        ) {
          const e = queue[cursor++];
          window.dispatchEvent(
            new KeyboardEvent(e.down ? 'keydown' : 'keyup', {
              code: e.code,
              bubbles: true,
            }),
          );
        }
      setTimeout(tick, 1);
    };
    tick();
  });
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.fever.stage >= 2,
    null,
    { timeout: 30000 },
  );
  await expect(page.locator('#fever-hud')).toBeVisible();
  await page.screenshot({ path: 'test-results/fever-stage2.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.paused);
  const frozen = await page.evaluate(
    () => (window as any).orvioDiagnostics.fever,
  );
  await page.waitForTimeout(300);
  expect(
    (await page.evaluate(() => (window as any).orvioDiagnostics)).fever,
  ).toEqual(frozen);
  await page.click('#pause-settings');
  await expect(page.locator('#fever-auto')).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.click('#resume');
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.fever.stage === 5,
    null,
    { timeout: 35000 },
  );
  await page.screenshot({ path: 'test-results/fever-stage5.png' });
  await expect(page.locator('#results')).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => ((window as any).feverAutoplay = false));
  const result = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(result.fever.journal.some((e: any) => e.kind === 'hold-tick')).toBe(
    true,
  );
  expect(result.fever.maxDisplayCombo).toBeGreaterThan(result.resolved);
  await expect(page.locator('#result-fever')).toBeVisible();
  await expect(page.locator('#result-fever')).toContainText(
    String(result.fever.maxDisplayCombo),
  );
  await page.screenshot({ path: 'test-results/fever-result.png' });
  await page.click('#watch-replay');
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.replayActive,
  );
  await expect(page.locator('#results')).toBeVisible({ timeout: 50000 });
  const replay = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(replay.events).toEqual(result.events);
  expect(replay.fever.journal).toEqual(result.fever.journal);
  expect(replay.fever.stage).toBe(result.fever.stage);
  expect(errors).toEqual([]);
  fs.writeFileSync(
    'test-results/fever-actual-proof.json',
    JSON.stringify({ result, replay }, null, 2),
  );
});
test('7K BREAK resets fever and OFF persists for the next session', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/select/?song=violet-drive&lanes=7&difficulty=high');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.evaluate(() => {
    const w = window as any,
      keys = ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'];
    const q = w.orvioDiagnostics.notes
      .flatMap((s: any) => [
        { time: s.note.time, code: keys[s.note.lane], down: true },
        {
          time: s.note.end ?? s.note.time + 0.03,
          code: keys[s.note.lane],
          down: false,
        },
      ])
      .sort(
        (a: any, b: any) => a.time - b.time || Number(a.down) - Number(b.down),
      );
    let i = 0;
    const tick = () => {
      if (w.orvioDiagnostics.fever.stage >= 2) return;
      if (w.orvioDiagnostics.active && !w.orvioDiagnostics.paused)
        while (i < q.length && w.orvioAudioTime >= q[i].time) {
          const e = q[i++];
          window.dispatchEvent(
            new KeyboardEvent(e.down ? 'keydown' : 'keyup', {
              code: e.code,
              bubbles: true,
            }),
          );
        }
      setTimeout(tick, 1);
    };
    tick();
  });
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.fever.stage === 2,
    null,
    { timeout: 25000 },
  );
  await page.waitForFunction(
    () => {
      const d = (window as any).orvioDiagnostics;
      return d.fever.stage === 1 && d.events.some((e: any) => e.value === 0);
    },
    null,
    { timeout: 5000 },
  );
  const reset = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(reset.fever.displayCombo).toBeLessThan(10);
  await page.screenshot({ path: 'test-results/fever-break-7k.png' });
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await page.click('#open-settings');
  await page.locator('#fever-auto').uncheck();
  await page.locator('#reduced-motion').check();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.click('#open-settings');
  await expect(page.locator('#fever-auto')).not.toBeChecked();
  await expect(page.locator('#reduced-motion')).toBeChecked();
  await page.keyboard.press('Escape');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const off = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(off.fever.status).toBe('off');
  expect(off.fever.stage).toBe(1);
  await expect(page.locator('#fever-hud')).toBeHidden();
  await page.screenshot({ path: 'test-results/fever-off-7k.png' });
});
test('reduced motion keeps active fever readable without stage animation', async ({
  page,
}) => {
  await page.goto('/select/?song=violet-drive&lanes=5&difficulty=high');
  await page.click('#open-settings');
  await page.locator('#reduced-motion').check();
  await page.keyboard.press('Escape');
  await page.click('#start');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  await page.evaluate(() => {
    const w = window as any,
      keys = ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'];
    const q = w.orvioDiagnostics.notes
      .flatMap((s: any) => [
        { time: s.note.time, code: keys[s.note.lane], down: true },
        {
          time: s.note.end ?? s.note.time + 0.03,
          code: keys[s.note.lane],
          down: false,
        },
      ])
      .sort(
        (a: any, b: any) => a.time - b.time || Number(a.down) - Number(b.down),
      );
    let i = 0;
    const tick = () => {
      if (w.orvioDiagnostics.fever.stage >= 2) return;
      while (i < q.length && w.orvioAudioTime >= q[i].time) {
        const e = q[i++];
        window.dispatchEvent(
          new KeyboardEvent(e.down ? 'keydown' : 'keyup', {
            code: e.code,
            bubbles: true,
          }),
        );
      }
      setTimeout(tick, 1);
    };
    tick();
  });
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.fever.stage >= 2,
  );
  await expect(page.locator('#fever-hud')).toHaveClass(/fever-reduced/);
  expect(
    await page
      .locator('#fever-hud strong')
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe('none');
  expect(
    await page
      .locator('#fever-hud i')
      .evaluate((e) => getComputedStyle(e).transitionDuration),
  ).toBe('0s');
  await page.screenshot({ path: 'test-results/fever-reduced-active.png' });
});
