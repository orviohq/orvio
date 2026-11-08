import { it, expect } from 'vitest';
import { adaptDecoratedChart } from '../src/external-chart-adapter';
import { Engine } from '../src/engine';
import {
  checkExternalReplay,
  type ExternalReplay,
} from '../src/external-replay';
import { validSourceRecord, type SourceRecord } from '../src/external-source';
const raw = [
  { id: 0, time: 1, lane: 0, type: 'hold', duration: 1 },
  { id: 1, time: 1, lane: 1, type: 'tap' },
  { id: 2, time: 2.2, lane: 0, type: 'tap' },
];
it('maps only hold representation, preserving exact time, lane, order and immutable input', () => {
  const before = JSON.stringify(raw),
    n = adaptDecoratedChart(raw, 5, 3);
  expect(n).toEqual([
    { id: 0, time: 1, lane: 0, end: 2 },
    { id: 1, time: 1, lane: 1 },
    { id: 2, time: 2.2, lane: 0 },
  ]);
  expect(JSON.stringify(raw)).toBe(before);
  for (const lanes of [5, 7] as const) {
    const e = new Engine(adaptDecoratedChart(raw, lanes, 3));
    for (const [sequence, lane, time, down] of [
      [0, 0, 1, true],
      [1, 1, 1, true],
      [2, 1, 1.1, false],
      [3, 0, 2, false],
      [4, 0, 2.2, true],
    ] as const)
      e.input({ sequence, lane, time, down });
    expect(e.score).toBe(1000000);
    expect(e.maxCombo).toBe(4);
    expect(e.total).toBe(4);
    expect(e.events.map((e) => e.tail)).toEqual([false, false, true, false]);
  }
});
it('rejects malformed or ambiguous notes instead of dropping, snapping or remapping', () => {
  for (const edit of [
    (r: any[]) => (r[0].duration = NaN),
    (r: any[]) => (r[0].duration = 0),
    (r: any[]) => (r[0].duration = 4),
    (r: any[]) => (r[1].lane = 0),
    (r: any[]) => (r[1].lane = 5),
    (r: any[]) => (r[1].id = 0),
    (r: any[]) => (r[1].time = 0.9),
    (r: any[]) => (r[1].duration = 1),
    (r: any[]) => (r[2].time = 1.5),
    (r: any[]) => (r[0].type = 'unknown'),
  ]) {
    const n = structuredClone(raw);
    edit(n);
    expect(() => adaptDecoratedChart(n, 5, 3)).toThrow();
  }
});
it('old source cap remains 130s independently of research-only adaptation', () => {
  const notes = adaptDecoratedChart(raw, 5, 187);
  const source = {
    version: 1,
    videoId: 'uXn-zOt68V8',
    audioSha256: 'a'.repeat(64),
    sampleRate: 48000,
    frames: 48000 * 187,
    estimatedBpm: 144,
    pipelineVersion: 'v1',
    analyzerVersion: 'research-c3',
    config: '{}',
    charts: Object.fromEntries(
      ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
        k,
        { notes, sha256: 'b'.repeat(64) },
      ]),
    ),
  };
  expect(validSourceRecord(source)).toBe(false);
});
it('source-bound replay keeps hold release and chart-clock pause independent of generator version', () => {
  const notes = adaptDecoratedChart(raw, 5, 3);
  const source: SourceRecord = {
    version: 1,
    videoId: 'uXn-zOt68V8',
    audioSha256: 'a'.repeat(64),
    sampleRate: 48000,
    frames: 48000 * 3,
    estimatedBpm: 144,
    pipelineVersion: 'v1',
    analyzerVersion: 'research-c3',
    config: '{}',
    charts: Object.fromEntries(
      ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
        k,
        { notes, sha256: 'b'.repeat(64) },
      ]),
    ) as SourceRecord['charts'],
  };
  const replay: ExternalReplay = {
    version: 1,
    source,
    chart: '5:high',
    ops: [
      [0, 1000, 1, 0, 1],
      [0, 1000, 1, 1, 1],
      [0, 1100, 1.1, 1, 0],
      [2, 1300, 1.3, 1],
      [2, 2300, 1.3, 0],
      [0, 3000, 2, 0, 0],
      [0, 3200, 2.2, 0, 1],
      [1, 4000, 3],
    ],
    endMs: 4000,
    score: 1000000,
    judgments: [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  expect(checkExternalReplay(replay)).toBe(true);
  replay.source.analyzerVersion = 'future-no-regenerate';
  expect(checkExternalReplay(replay)).toBe(true);
  replay.ops[5][2] = 1.5;
  replay.score = 750000;
  replay.judgments = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
  expect(checkExternalReplay(replay)).toBe(true);
});

it('tail20 leaves same-lane next head playable across existing release judgment boundaries', () => {
  for (const lanes of [5, 7] as const)
    for (const [offset, tail] of [
      [-0.11668, 0],
      [-0.11666, 100],
      [0, 100],
      [0.11666, 100],
      [0.11668, 1],
      [0.15001, 1],
    ] as const) {
      const e = new Engine(
        adaptDecoratedChart(
          [
            { id: 0, time: 1, lane: lanes - 1, type: 'hold', duration: 1 },
            { id: 1, time: 2.2, lane: lanes - 1, type: 'tap' },
          ],
          lanes,
          3,
        ),
      );
      e.input({ sequence: 0, lane: lanes - 1, time: 1, down: true });
      e.input({ sequence: 1, lane: lanes - 1, time: 2 + offset, down: false });
      e.input({ sequence: 2, lane: lanes - 1, time: 2.2, down: true });
      expect(e.events.map((x) => [x.noteId, x.tail, x.value])).toEqual([
        [0, false, 100],
        [0, true, tail],
        [1, false, 100],
      ]);
      expect(e.resolved).toBe(3);
      expect(e.total).toBe(3);
      expect(e.breaks).toBe(tail === 0 ? 1 : 0);
    }
});
