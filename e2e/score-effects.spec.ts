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
      // Capture on the page's first score mutation, not a later remote read.
      // A production network/trace round-trip may exceed the 220ms effect.
      await page.evaluate(() => {
        const score = document.querySelector('#score')!;
        (window as any).scoreMutationSample = undefined;
        const observer = new MutationObserver(() => {
          const target = Number((score as HTMLElement).dataset.target);
          if (target <= 0) return;
          (window as any).scoreMutationSample = {
            shown: Number(score.textContent),
            target,
            animations: score.getAnimations().length,
          };
          observer.disconnect();
        });
        observer.observe(score, {
          attributes: true,
          childList: true,
          characterData: true,
        });
      });
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
      const during = await page.evaluate(
        () => (window as any).scoreMutationSample,
      );
      expect(during).toBeDefined();
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
