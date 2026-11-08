import { test, expect } from 'vitest';
import { SONGS, makeChart } from '../src/chart';
import { Engine } from '../src/engine';
import { CURRENT_FEVER } from '../src/fever';
import { transformChart, FADERS } from '../src/game-options';
import {
  encodeReplay,
  decodeReplay,
  replayMatches,
  type ReplayData,
} from '../src/replay';
import { resultParams, readResult } from '../src/share';
// Independent backend port must match current frontend chart, shuffle and exact input math.
import {
  validateFragmentSchema,
  verifyReplay,
  __test__,
} from './backend-validator.mjs';
test('backend validator agrees on every chart/effect/shuffle with original float timings', async () => {
  let count = 0;
  for (const song of SONGS)
    for (const lanes of [5, 7] as const)
      for (const difficulty of ['low', 'mid', 'high', 'sc'] as const)
        for (const shuffle of ['off', 'mirror', 'random'] as const) {
          const fader = FADERS[count++ % FADERS.length],
            options = { speed: 9, fader, shuffle, seed: 4294967295 };
          const notes = transformChart(
            makeChart(song, difficulty, lanes),
            lanes,
            shuffle,
            options.seed,
          );
          expect(
            __test__.transformChart(
              __test__.makeChart(
                __test__.SONGS.find((s: any) => s.id === song.id),
                difficulty,
                lanes,
              ),
              lanes,
              shuffle,
              options.seed,
            ),
          ).toEqual(notes);
          const ops: ReplayData['ops'] = notes
            .flatMap((n, i) => {
              const t = n.time + (i % 5) * 0.001234567891234;
              return [
                [0, t * 1000 + 170, t, n.lane, 1],
                [
                  0,
                  (n.end ?? t + 0.03) * 1000 + 170,
                  n.end ?? t + 0.03,
                  n.lane,
                  0,
                ],
              ] as ReplayData['ops'];
            })
            .sort((a, b) => a[1] - b[1]);
          const end = Math.max(...ops.map((x) => x[1])) + 1000;
          ops.push([1, end, 9999]);
          const e = new Engine(notes);
          ops.forEach((op, i) =>
            op[0] === 0
              ? e.input({
                  lane: op[3],
                  time: op[2],
                  down: !!op[4],
                  sequence: i,
                })
              : e.update(op[2]),
          );
          const r: ReplayData = {
            version: 1,
            song: song.id as ReplayData['song'],
            lanes,
            difficulty,
            options,
            ops,
            end,
            audioLeadIn: 4.2,
            fever: { ...CURRENT_FEVER, auto: count % 2 === 0 },
          };
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
          const text = await encodeReplay(r);
          expect(await decodeReplay(text)).toEqual(r);
          expect(await __test__.decodeReplay(text)).toEqual(r);
          const p = resultParams(result);
          p.set('rp', '1');
          p.set('rn', String(text.length));
          p.set('r', text);
          const validated = validateFragmentSchema(p.toString());
          expect(
            validated.error,
            JSON.stringify({ song: song.id, lanes, difficulty, shuffle }),
          ).toBeUndefined();
          expect(await verifyReplay(text, validated.result)).toEqual({
            ok: true,
          });
          expect(
            (await verifyReplay(text.slice(0, -4), validated.result)).ok,
          ).toBe(false);
        }
});

test('backend preserves strict legacy result-only versions without invented fields', () => {
  for (const v of ['1', '2', '3']) {
    const p = new URLSearchParams({
      v,
      song: 'first-light',
      keys: '5',
      diff: 'low',
      score: '1000000',
      acc: '100.00',
      combo: '1',
    });
    if (v === '3') p.set('j', '1,0,0,0,0,0,0,0,0,0,0,0');
    const frontend = readResult(p);
    expect(frontend).not.toBeNull();
    const backend = validateFragmentSchema(p.toString());
    expect(backend.error).toBeUndefined();
    expect(backend.result).toMatchObject(frontend!);
    expect(backend.result.options).toBeUndefined();
    expect(backend.result.replay).toBeNull();
    if (v !== '3') expect(backend.result.judgments).toBeUndefined();
    else {
      const missing = new URLSearchParams(p);
      missing.delete('j');
      expect(validateFragmentSchema(missing.toString()).error).toBe(
        'bad_fragment_format',
      );
      const inconsistent = new URLSearchParams(p);
      inconsistent.set('score', '999999');
      expect(validateFragmentSchema(inconsistent.toString()).error).toBe(
        'bad_fragment_format',
      );
    }
    for (const [k, value] of [
      ['rp', '1'],
      ['rn', '1'],
      ['r', 'A'],
    ]) {
      const attached = new URLSearchParams(p);
      attached.set(k, value);
      expect(validateFragmentSchema(attached.toString()).error).toBe(
        'bad_fragment_format',
      );
    }
    for (const key of ['score', 'acc', 'combo']) {
      const missing = new URLSearchParams(p);
      missing.delete(key);
      expect(validateFragmentSchema(missing.toString()).error).toBe(
        'bad_fragment_format',
      );
    }
    expect(validateFragmentSchema(p.toString() + '&v=' + v).error).toBe(
      'bad_fragment_format',
    );
    expect(validateFragmentSchema(p.toString() + '&host=arbitrary').error).toBe(
      'bad_fragment_format',
    );
  }
});
