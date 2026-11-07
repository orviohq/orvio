import { it, expect } from 'vitest';
import {
  checkExternalReplay,
  type ExternalReplay,
} from '../src/external-replay';
import type { SourceRecord } from '../src/external-source';
function replay(): ExternalReplay {
  const source: SourceRecord = {
    version: 1,
    videoId: 'uXn-zOt68V8',
    audioSha256: 'a'.repeat(64),
    sampleRate: 48000,
    estimatedBpm: 144,
    frames: 48000 * 125,
    pipelineVersion: 'v1',
    analyzerVersion: 'v1',
    config: '{}',
    charts: Object.fromEntries(
      ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
        k,
        { notes: [{ id: 0, time: 1, lane: 0 }], sha256: 'b'.repeat(64) },
      ]),
    ) as SourceRecord['charts'],
  };
  return {
    version: 1,
    source,
    chart: '5:low',
    ops: [
      [0, 1000, 1, 0, 1],
      [0, 1020, 1.02, 0, 0],
      [1, 2000, 2],
    ],
    endMs: 2000,
    score: 1000000,
    judgments: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}
it('simulates exact embedded notes without invoking a future generator', () => {
  const r = replay();
  expect(checkExternalReplay(r)).toBe(true);
  r.source.analyzerVersion = 'future-v999';
  expect(checkExternalReplay(r)).toBe(true);
});
it('rejects wrong result, order or out-of-lane input', () => {
  for (const edit of [
    (r: ExternalReplay) => (r.score = 0),
    (r: ExternalReplay) => (r.ops[1][1] = 999),
    (r: ExternalReplay) => ((r.ops[0] as any)[3] = 7),
  ]) {
    const r = replay();
    edit(r);
    expect(checkExternalReplay(r)).toBe(false);
  }
});
