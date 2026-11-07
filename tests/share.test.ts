import { describe, it, expect } from 'vitest';
import { readResult, resultParams } from '../src/share';
import { resultPNG } from '../server/png';
import { onRequest } from '../functions/result/index';
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
      ['v', '2'],
    ]) {
      const bad = resultParams(r);
      bad.set(k, v);
      expect(readResult(bad)).toBeNull();
    }
  });
  it('serves crawlable HTML and stable valid PNG bytes without network', async () => {
    const params = resultParams(r);
    const page = await onRequest({
      request: new Request('https://example.invalid/result/?' + params),
    });
    const html = await page.text();
    expect(html).toContain('og:image');
    expect(html).toContain('twitter:card');
    expect(html).toContain('987,654');
    expect(html).toContain('not verified');
    expect(html).not.toContain('<script');
    const a = await resultPNG(r),
      b = await resultPNG(r);
    expect(a).toEqual(b);
    expect([...a.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(a.length).toBeLessThan(30000);
    const invalid = await onRequest({
      request: new Request('https://example.invalid/result/?score=oops'),
    });
    expect(invalid.status).toBe(400);
    const post = await onRequest({
      request: new Request('https://example.invalid/result/', {
        method: 'POST',
      }),
    });
    expect(post.status).toBe(405);
  });
});
