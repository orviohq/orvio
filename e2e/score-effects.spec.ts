import { test, expect } from '@playwright/test';
import { atKey } from './input';
for (const reduced of [false, true])
  test(
    'score display animates without changing judgment, reduced=' + reduced,
    async ({ page }) => {
      await page.addInitScript(
        (r) =>
          localStorage.setItem(
            'orvio.settings.v1',
            JSON.stringify({ reducedMotion: r }),
          ),
        reduced,
      );
      await page.goto('/play/first-light/5/low/');
      await page.click('#ready-start');
      await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
      const note = await page.evaluate(
        () => (window as any).orvioDiagnostics.notes[0].note,
      );
      await atKey(
        page,
        note.time,
        ['d', 'f', 'Space', 'j', 'k'][note.lane],
        true,
      );
      await page.waitForFunction(
        () =>
          Number(
            document.querySelector('#score')?.getAttribute('data-target'),
          ) > 0,
      );
      const during = await page.locator('#score').evaluate((e) => ({
        shown: Number(e.textContent),
        target: Number((e as HTMLElement).dataset.target),
        animations: e.getAnimations().length,
      }));
      if (reduced) {
        expect(during.shown).toBe(during.target);
        expect(during.animations).toBe(0);
      } else expect(during.animations).toBeGreaterThan(0);
      await page.screenshot({
        path: 'test-results/012-score-' + reduced + '.png',
      });
      await page.waitForTimeout(200);
      expect(Number(await page.locator('#score').textContent())).toBe(
        await page.evaluate(() => (window as any).orvioDiagnostics.score),
      );
      const event = await page.evaluate(
        () => (window as any).orvioDiagnostics.events[0],
      );
      expect(event.value).toBeGreaterThan(0);
      await page.keyboard.up(['d', 'f', 'Space', 'j', 'k'][note.lane]);
    },
  );
