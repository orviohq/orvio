import type { Page } from '@playwright/test';
/** Synthetic current-version miss-only replay. No requests or paid extraction. */
export async function sonnerResultFixture(page: Page): Promise<string> {
  await page.goto('/select/');
  return page.evaluate(async () => {
    const { replayEngine } = await import(
      /* @vite-ignore */ String('/src/replay.ts')
    );
    const { builtinShareFragment } = await import(
      /* @vite-ignore */ String('/src/builtin-share-fragment.ts')
    );
    const replay = {
      version: 1,
      song: 'first-light',
      lanes: 5,
      difficulty: 'low',
      options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 1 },
      ops: [],
      end: 100,
    };
    const engine = replayEngine(replay);
    engine.update(9999);
    return builtinShareFragment(replay, {
      song: 'first-light',
      lanes: 5,
      difficulty: 'low',
      score: engine.score,
      accuracy: engine.sum / engine.total,
      combo: engine.maxCombo,
      options: replay.options,
      judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
        (v) => engine.events.filter((e: any) => e.value === v).length,
      ),
    });
  });
}
