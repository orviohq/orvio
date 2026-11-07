import { describe, it, expect } from 'vitest';
import { readResult, resultParams } from '../src/share';
import { resultPNG } from '../server/png';
import { readFileSync, existsSync } from 'node:fs';
const r = {
  song: 'first-light' as const,
  lanes: 7 as const,
  difficulty: 'high' as const,
  score: 987654,
  accuracy: 98.76,
  combo: 345,
};
describe('privacy-safe result sharing', () => {
  it('roundtrips only permitted fields and rejects invalid values', () => {
    const p = resultParams(r);
    p.set('name', 'private');
    expect(readResult(p)).toEqual(r);
    expect(resultParams(readResult(p)!).has('name')).toBe(false);
    for (const [k, v] of [
      ['song', '<script>'],
      ['keys', '6'],
      ['score', '1000001'],
      ['score', 'NaN'],
      ['acc', '101'],
      ['combo', '-1'],
      ['diff', 'extreme'],
      ['v', '5'],
    ]) {
      const bad = resultParams(r);
      bad.set(k, v);
      expect(readResult(bad)).toBeNull();
    }
  });
  it('retains deterministic offline PNG rendering without server routes', async () => {
    expect(existsSync('functions/result/index.ts')).toBe(false);
    expect(existsSync('functions/result.png.ts')).toBe(false);
    expect(readFileSync('src/pages/result.astro', 'utf8')).toContain('<Game');
    const a = await resultPNG(r),
      b = await resultPNG(r);
    expect(a).toEqual(b);
    expect([...a.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(a.length).toBeLessThan(100000);
  });
});

it('v3 carries bounded consistent anonymous judgments, not performance or identity', () => {
  const full = {
    song: 'first-light' as const,
    lanes: 5 as const,
    difficulty: 'low' as const,
    score: 500000,
    accuracy: 50,
    combo: 1,
    judgments: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  };
  const params = resultParams(full);
  expect(params.size).toBe(8);
  expect(params.get('v')).toBe('3');
  expect(readResult(params)).toEqual(full);
  for (const value of [
    '1,2',
    '-1,0,0,0,0,0,0,0,0,0,0,1',
    '10001,0,0,0,0,0,0,0,0,0,0,1',
    '1,0,0,0,0,0,0,0,0,0,0,0',
  ]) {
    const bad = new URLSearchParams(params);
    bad.set('j', value);
    expect(readResult(bad)).toBeNull();
  }
});
it('v4 preserves only bounded gameplay options, no device or input binding data', () => {
  const full = {
    song: 'first-light' as const,
    lanes: 5 as const,
    difficulty: 'low' as const,
    score: 500000,
    accuracy: 50,
    combo: 1,
    judgments: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    options: {
      speed: 9,
      fader: 'out2' as const,
      shuffle: 'random' as const,
      seed: 123,
    },
  };
  expect(readResult(resultParams(full))).toEqual(full);
  for (const [key, value] of [
    ['speed', 'NaN'],
    ['speed', '10'],
    ['fade', 'bad'],
    ['shuffle', 'bad'],
    ['seed', '-1'],
  ]) {
    const params = resultParams(full);
    params.set(key, value);
    expect(readResult(params)).toBeNull();
  }
});
