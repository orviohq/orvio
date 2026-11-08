import type { Note } from '../src/chart';
import { it, expect } from 'vitest';
import {
  encodeExternalShare,
  decodeExternalShare,
  externalReplayEngine,
  type ExternalSharedReplay,
} from '../src/external-share';
import { sourceId } from '../src/external-catalog';
import {
  applyReplayOp,
  type RuntimeReplay,
  type ReplayOp,
} from '../src/replay';
import { packReplay } from '../src/replay-binary';
import { CURRENT_FEVER } from '../src/fever';
import { type SourceRecord } from '../src/external-source';
const sha = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
export async function fixture(): Promise<ExternalSharedReplay> {
  const notes: Note[] = [
    ...Array.from({ length: 110 }, (_, i) => ({
      id: i,
      time: 0.4 + i * 0.045,
      lane: i % 4,
    })),
    { id: 110, time: 0.42, lane: 4, end: 5.6 },
  ].sort((a, b) => a.time - b.time);
  const record: SourceRecord = {
    version: 1,
    videoId: 'AAAAAAAAAAA',
    audioSha256: 'a'.repeat(64),
    sampleRate: 48000,
    frames: 48000 * 7,
    estimatedBpm: 140,
    pipelineVersion: 'fixture-v1',
    analyzerVersion: 'fixture-v1',
    config: '{}',
    charts: Object.fromEntries(
      await Promise.all(
        [
          '5:low',
          '5:mid',
          '5:high',
          '7:low',
          '7:mid',
          '7:high',
          '5:sc',
          '7:sc',
        ].map(async (k) => [
          k,
          { notes, sha256: await sha(JSON.stringify(notes)) },
        ]),
      ),
    ) as SourceRecord['charts'],
  };
  const events: ReplayOp[] = notes
    .flatMap(
      (n) =>
        [
          [0, n.time * 1000 + 1700, n.time, n.lane, 1],
          [
            0,
            (n.end ?? n.time + 0.01) * 1000 + 1700,
            n.end ?? n.time + 0.01,
            n.lane,
            0,
          ],
        ] as ReplayOp[],
    )
    .sort((a, b) => a[1] - b[1]);
  events.push(
    [2, 8000, 6, 1],
    [3, 8100, 6, 8.7, 'out2'],
    [2, 8300, 6, 0],
    [1, 8400, 6.1],
    [1, 8500, 9999],
  );
  const replay: RuntimeReplay = {
    version: 1,
    song: sourceId(record),
    lanes: 5,
    difficulty: 'sc',
    options: { speed: 1.7, fader: 'out', shuffle: 'off', seed: 1234 },
    audioLeadIn: 1.7,
    fever: { ...CURRENT_FEVER },
    end: 8500,
    ops: events,
  };
  const engine = externalReplayEngine(replay, record);
  events.forEach((op, i) => applyReplayOp(engine, op, i));
  engine.update(9999);
  return {
    record,
    replay,
    title: 'Synthetic replay fixture',
    jobId: 'fixture-existing-job',
    result: {
      song: replay.song,
      lanes: 5,
      difficulty: 'sc',
      options: { ...replay.options, speed: 8.7, fader: 'out2' },
      score: engine.score,
      accuracy: engine.sum / engine.total,
      combo: engine.maxCombo,
      judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
        (v) => engine.events.filter((e) => e.value === v).length,
      ),
    },
  };
}
it('R2 roundtrip preserves every input/op float bit, options, holds and complete real-engine FEVER journey', async () => {
  const data = await fixture();
  const fragment = await encodeExternalShare(data),
    decoded = await decodeExternalShare(fragment);
  expect(decoded.record).toEqual(data.record);
  expect(decoded.replay).toEqual(data.replay);
  expect(decoded.result).toEqual({
    ...data.result,
    accuracy: Math.round(data.result.accuracy * 100) / 100,
  });
  expect(packReplay(decoded.replay as any)).toEqual(
    packReplay(data.replay as any),
  );
  const before = externalReplayEngine(data.replay, data.record),
    after = externalReplayEngine(decoded.replay, decoded.record);
  const snapshots = [];
  for (let i = 0; i < data.replay.ops.length; i++) {
    applyReplayOp(before, data.replay.ops[i], i);
    applyReplayOp(after, decoded.replay.ops[i], i);
    const read = (e: typeof before) => ({
      events: e.events,
      score: e.score,
      combo: e.combo,
      stage: e.fever.stage,
      charge: e.fever.charge,
      display: e.fever.displayCombo,
      max: e.fever.maxDisplayCombo,
      journal: e.fever.journal,
    });
    expect(read(after)).toEqual(read(before));
    snapshots.push(before.fever.stage);
  }
  expect(Math.max(...snapshots)).toBeGreaterThan(1);
  expect(before.fever.journal.length).toBeGreaterThan(0);
});
it('rejects source hash, score, ops and option tampering and never regenerates a chart', async () => {
  const data = await fixture();
  for (const edit of [
    (x: ExternalSharedReplay) =>
      (x.record.charts['5:sc']!.notes[0].time += 0.1),
    (x: ExternalSharedReplay) => x.result.score--,
    (x: ExternalSharedReplay) => (x.replay.ops[0][2] += 0.12),
    (x: ExternalSharedReplay) => x.result.options!.seed++,
  ]) {
    const changed = structuredClone(data);
    edit(changed);
    await expect(encodeExternalShare(changed)).rejects.toThrow();
  }
  const fragment = await encodeExternalShare(data);
  await expect(decodeExternalShare(fragment.slice(0, -4))).rejects.toThrow();
  await expect(
    decodeExternalShare(fragment + '&d=duplicate'),
  ).rejects.toThrow();
});
it('optional old job id does not block chart/result delivery; title is never silently truncated', async () => {
  const data = await fixture();
  delete data.jobId;
  data.title = '가'.repeat(300);
  expect(
    (await decodeExternalShare(await encodeExternalShare(data))).title,
  ).toBe(data.title);
  data.title += '가';
  await expect(encodeExternalShare(data)).rejects.toThrow();
  data.title = 'Valid';
  data.jobId = '../other';
  await expect(encodeExternalShare(data)).rejects.toThrow();
});
it('fails oversized/corrupt payloads without fitting, truncating or accepting unknown envelope fields', async () => {
  await expect(
    decodeExternalShare('v=5&d=' + 'a'.repeat(699053)),
  ).rejects.toThrow();
  const raw = { kind: 'external-replay', unexpected: 'ignored?' };
  const stream = new Blob([JSON.stringify(raw)])
    .stream()
    .pipeThrough(new CompressionStream('deflate'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  await expect(
    decodeExternalShare('v=5&d=' + Buffer.from(bytes).toString('base64url')),
  ).rejects.toThrow();
});
