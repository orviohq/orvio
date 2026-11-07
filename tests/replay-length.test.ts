import { test, expect } from 'vitest';
import { SONGS, makeChart } from '../src/chart';
import { Engine } from '../src/engine';
import {
  encodeReplay,
  decodeReplay,
  replayMatches,
  type ReplayData,
} from '../src/replay';
import { resultParams } from '../src/share';
import { writeFileSync } from 'node:fs';
test('all eighteen complete charts with pauses/effects measure full URL sizes and reject truncated payloads', async () => {
  const rows = [];
  for (const song of SONGS)
    for (const lanes of [5, 7] as const)
      for (const difficulty of ['low', 'mid', 'high'] as const) {
        const notes = makeChart(song, difficulty, lanes),
          e = new Engine(notes),
          options = {
            speed: 9,
            fader: 'out2' as const,
            shuffle: 'off' as const,
            seed: 4294967295,
          };
        const ops: ReplayData['ops'] = notes
          .flatMap(
            (n) =>
              [
                [0, n.time * 1000, n.time, n.lane, 1],
                [
                  0,
                  (n.end ?? n.time + 0.03) * 1000,
                  n.end ?? n.time + 0.03,
                  n.lane,
                  0,
                ],
              ] as ReplayData['ops'],
          )
          .sort((a, b) => a[1] - b[1]);
        ops.forEach(
          (op, i) =>
            op[0] === 0 &&
            e.input({ lane: op[3], time: op[2], down: !!op[4], sequence: i }),
        );
        e.update(9999);
        const end = Math.max(...ops.map((x) => x[1])) + 1000;
        for (let i = 0; i < 100; i++)
          ops.push(
            [2, end + i * 10, notes.at(-1)!.time, i % 2 ? 1 : 0],
            [
              3,
              end + i * 10,
              notes.at(-1)!.time,
              i % 2 ? 1.5 : 9,
              i % 2 ? 'in2' : 'out2',
            ],
          );
        ops.push([1, end + 2000, 9999]);
        const r: ReplayData = {
          version: 1,
          song: song.id as ReplayData['song'],
          lanes,
          difficulty,
          options,
          ops,
          end: end + 2000,
        };
        const encoded = await encodeReplay(r);
        expect(await decodeReplay(encoded)).toEqual(r);
        const result = {
          song: r.song,
          lanes,
          difficulty,
          options,
          score: e.score,
          accuracy: e.sum / e.total,
          combo: e.maxCombo,
          judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
            (v) => e.events.filter((x) => x.value === v).length,
          ),
        };
        expect(replayMatches(r, result)).toBe(true);
        const p = resultParams(result);
        p.set('rp', '1');
        p.set('rn', String(encoded.length));
        p.set('r', encoded);
        rows.push({
          song: song.id,
          lanes,
          difficulty,
          notes: notes.length,
          ops: ops.length,
          payload: encoded.length,
          url: ('https://orvio-play.pages.dev/result/#' + p).length,
        });
        for (const removed of [1, 4, Math.floor(encoded.length / 2)])
          expect(await decodeReplay(encoded.slice(0, -removed))).toBeNull();
      }
  writeFileSync(
    '/tmp/orvio-replay-lengths.json',
    JSON.stringify(rows, null, 2),
  );
  console.log(
    'Full URL lengths',
    rows.map((x) => x.url),
    'max',
    Math.max(...rows.map((x) => x.url)),
  );
});
test('realistic float jitter and bounded worst operation count keep every original double', async () => {
  const rows = [];
  let seed = 190783;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const song of SONGS) {
    const notes = makeChart(song, 'high', 7),
      ops: ReplayData['ops'] = [];
    for (const n of notes) {
      for (const down of [1, 0] as const) {
        const a =
          (down ? n.time : (n.end ?? n.time + 0.03)) + (random() - 0.5) * 0.12;
        ops.push([0, a * 1000 + 150 + random() * 5, a, n.lane, down]);
      }
    }
    ops.sort((a, b) => a[1] - b[1]);
    const r: ReplayData = {
      version: 1,
      song: song.id as ReplayData['song'],
      lanes: 7,
      difficulty: 'high',
      options: { speed: 9, fader: 'out2', shuffle: 'random', seed: 4294967295 },
      ops,
      end: Math.max(...ops.map((x) => x[1])) + 1000,
    };
    const encoded = await encodeReplay(r);
    expect(await decodeReplay(encoded)).toEqual(r);
    rows.push({ song: song.id, payload: encoded.length });
  }
  console.log('Jittered input payloads (URL adds result metadata)', rows);
  const ops: ReplayData['ops'] = Array.from({ length: 12000 }, (_, i) => [
    0,
    i * 40 + random(),
    i * 0.04 + random() * 0.01,
    i % 7,
    (i % 2) as 0 | 1,
  ]);
  const r: ReplayData = {
    version: 1,
    song: 'first-light',
    lanes: 7,
    difficulty: 'high',
    options: { speed: 9, fader: 'off', shuffle: 'off', seed: 0 },
    ops,
    end: 500000,
  };
  const { packReplay, unpackReplay } = await import('../src/replay-binary');
  expect(unpackReplay(packReplay(r))).toEqual(r);
  await expect(encodeReplay(r)).rejects.toThrow('Replay link too large');
});
