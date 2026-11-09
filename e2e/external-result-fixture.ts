// Shared fixture builder, not shared mutable output. Uses genuine frozen v027 record.
import type { Page } from '@playwright/test';
export async function externalResultFixtureFragment(
  page: Page,
  raw: string,
): Promise<string> {
  return page.evaluate(async (raw) => {
    const record = JSON.parse(raw);
    const { sourceId } = await import(
      /* @vite-ignore */ String('/src/external-catalog.ts')
    );
    const { encodeExternalShare, externalReplayEngine } = await import(
      /* @vite-ignore */ String('/src/external-share.ts')
    );
    const replay: any = {
      version: 1,
      song: sourceId(record),
      lanes: 5,
      difficulty: 'low',
      options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 1 },
      ops: [[1, 3000, 9999]],
      end: 3000,
    };
    const engine = externalReplayEngine(replay, record);
    engine.update(9999);
    return encodeExternalShare({
      record,
      replay,
      title: 'A38 Verified Result Title',
      result: {
        song: replay.song,
        lanes: 5,
        difficulty: 'low',
        options: replay.options,
        score: engine.score,
        accuracy: engine.sum / engine.total,
        combo: engine.maxCombo,
        judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
          (v) => engine.events.filter((e: any) => e.value === v).length,
        ),
      },
    });
  }, raw);
}
