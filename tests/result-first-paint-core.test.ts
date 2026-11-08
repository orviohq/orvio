import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  evictResultDisplayEntries,
  fnv128,
  isProjectionExpired,
  resultFingerprint,
  resultIdentityKey,
} from '../src/result-first-paint-core';
import { resultBadgeData, resultBadges } from '../src/result-badges';

const RESULT = {
  song: 'first-light',
  lanes: 5 as const,
  difficulty: 'low' as const,
  score: 17857,
  accuracy: 1.79,
  combo: 1,
  judgments: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 55],
  options: {
    speed: 1.5,
    fader: 'off',
    shuffle: 'off' as const,
    mirror: false,
    blind: false,
  },
};

describe('fnv128', () => {
  // The inline bootstrap cannot import modules; it carries a verbatim copy
  // of the algorithm. Pin the copy to the implementation.
  it('matches the bootstrap inline copy exactly', () => {
    const source = readFileSync(
      new URL('../src/result-first-paint-bootstrap.js', import.meta.url),
      'utf8',
    );
    const match = source.match(/const fnv = \(value\) => \{[\s\S]*?\n    \};/);
    expect(match, 'bootstrap fnv source').toBeTruthy();
    const bootstrapFnv = eval(
      `(${match![0].replace('const fnv = ', '').replace(/;\s*$/, '')})`,
    );
    const corpus = [
      '',
      'a',
      'v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1',
      'v=5&d=' + 'x'.repeat(2542),
      '첫번째빛 결과 화면',
      'z'.repeat(130000),
      'v=3&song=a',
      'v=3&song=b',
    ];
    for (const value of corpus) expect(bootstrapFnv(value)).toBe(fnv128(value));
  });

  it('hashes the full fragment (no prefix truncation)', () => {
    const base = 'v=5&d=' + 'q'.repeat(2000);
    expect(fnv128(base + 'A')).not.toBe(fnv128(base + 'B'));
    expect(fnv128('x'.repeat(48))).not.toBe(fnv128('x'.repeat(48) + 'y'));
  });
});

describe('resultIdentityKey', () => {
  it('derives share, local and fragment identities', () => {
    expect(
      resultIdentityKey(
        'https://orvio.pages.dev/result/?s=replay0000000000000000aa',
      ),
    ).toBe('s:replay0000000000000000aa');
    expect(
      resultIdentityKey('https://orvio.pages.dev/result/?local=builtin:1234'),
    ).toBe('local:builtin:1234');
    expect(
      resultIdentityKey('https://orvio.pages.dev/result/#v=3&song=x'),
    ).toBe('h:' + fnv128('v=3&song=x'));
  });
  it('rejects non-result routes and malformed identities', () => {
    expect(
      resultIdentityKey('https://orvio.pages.dev/select/?s=abcDef12'),
    ).toBeNull();
    expect(
      resultIdentityKey('https://orvio.pages.dev/result/?s=bad!chars'),
    ).toBeNull();
    expect(
      resultIdentityKey('https://orvio.pages.dev/result/?s=short'),
    ).toBeNull();
    expect(resultIdentityKey('https://orvio.pages.dev/result/')).toBeNull();
    expect(resultIdentityKey('not a url')).toBeNull();
  });
  it('prefers s over local over fragment, and treats distinct fragments distinctly', () => {
    expect(
      resultIdentityKey(
        'https://orvio.pages.dev/result/?s=replay0000000000000000aa&local=x#v=3',
      ),
    ).toBe('s:replay0000000000000000aa');
    const a = resultIdentityKey('https://orvio.pages.dev/result/#v=3&song=a');
    const b = resultIdentityKey('https://orvio.pages.dev/result/#v=3&song=b');
    expect(a).not.toBe(b);
  });
});

describe('resultFingerprint', () => {
  it('is stable for the same result and sensitive to every displayed field', () => {
    const fp = resultFingerprint(RESULT as never);
    expect(resultFingerprint({ ...RESULT } as never)).toBe(fp);
    expect(resultFingerprint({ ...RESULT, accuracy: 1.8 } as never)).not.toBe(
      fp,
    );
    expect(resultFingerprint({ ...RESULT, score: 17858 } as never)).not.toBe(
      fp,
    );
    expect(resultFingerprint({ ...RESULT, options: null } as never)).not.toBe(
      fp,
    );
    expect(
      resultFingerprint({
        ...RESULT,
        judgments: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 56],
      } as never),
    ).not.toBe(fp);
  });
  it('formats accuracy to the displayed precision', () => {
    expect(resultFingerprint(RESULT as never)).toContain('|1.79|');
  });
});

describe('isProjectionExpired', () => {
  it('treats missing expiry as non-expiring and past/invalid expiry as expired', () => {
    expect(isProjectionExpired(undefined, 1000)).toBe(false);
    expect(isProjectionExpired(2000, 1000)).toBe(false);
    expect(isProjectionExpired(1000, 1000)).toBe(true);
    expect(isProjectionExpired(Number.NaN, 1000)).toBe(true);
  });
});

describe('evictResultDisplayEntries', () => {
  const entry = (pad: number) => ({ title: 'x'.repeat(pad) });
  it('keeps everything under budget', () => {
    const entries = { a: entry(10), b: entry(10) };
    expect(evictResultDisplayEntries(entries, new Set(['b']), 100000)).toEqual(
      entries,
    );
  });
  it('evicts oldest first until the store fits, never the just-written keys', () => {
    const entries = { a: entry(100), b: entry(100), c: entry(100) };
    const out = evictResultDisplayEntries(entries, new Set(['c']), 350);
    expect(out.c).toBeDefined();
    expect(Object.keys(out).length).toBeLessThan(3);
    expect(Object.keys(out)[Object.keys(out).length - 1]).toBe('c');
  });
  it('still writes when the new entry alone exceeds the budget (updates never fail)', () => {
    const entries = { a: entry(5000) };
    const out = evictResultDisplayEntries(entries, new Set(['a']), 100);
    expect(out.a).toBeDefined();
  });
});

describe('resultBadgeData', () => {
  const labels = {
    keys: 'KEY',
    difficulty: 'NM 2',
    speed: 'SPEED',
    shuffle: 'SHUFFLE',
    fader: 'FADER',
  };
  it('produces typed badges with no markup in values', () => {
    const data = resultBadgeData(RESULT as never, labels);
    expect(data.map((d) => d.kind)).toEqual([
      'keys',
      'difficulty',
      'speed',
      'shuffle',
      'fader',
    ]);
    expect(data[0].value).toBe('5K');
    expect(data[1].value).toBe('NM 2');
    expect(data[2].value).toBe('1.5×');
    expect(data[3].value).toBe('OFF');
    for (const d of data) {
      expect(d.value).not.toMatch(/[<>]/);
      expect(d.label).not.toMatch(/[<>]/);
      for (const el of d.icon.elements)
        if (el.type === 'path') expect(el.d).toMatch(/^[-0-9A-Za-z .,:]+$/);
    }
  });
  it('matches what resultBadges renders for the live dialog', () => {
    const data = resultBadgeData(RESULT as never, labels);
    const html = resultBadges(RESULT as never, labels);
    for (const d of data) {
      expect(html).toContain(`result-option-${d.kind}`);
      expect(html).toContain(`>${d.value}<`);
    }
    expect((html.match(/result-option-/g) ?? []).length).toBe(data.length);
  });
  it('omits option badges for results without options', () => {
    const data = resultBadgeData({ ...RESULT, options: null } as never, labels);
    expect(data.map((d) => d.kind)).toEqual(['keys', 'difficulty']);
  });
});
