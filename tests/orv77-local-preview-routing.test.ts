import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { startPreview } from '../src/preview-playback';

const main = readFileSync(
  process.env.ORV77_BASELINE_MAIN ?? new URL('../src/main.ts', import.meta.url),
  'utf8',
);
const caller = main.match(/startPreview\(\r?\n      source,\r?\n      (.+),\r?\n      track\.buffer\.duration,?\r?\n    \)/);
if (!caller) throw new Error('Application track preview caller not found');
const classify = new Function('song', 'externalSource', 'localAllKeysSource', `return (${caller[1]});`);

class FakeSource {
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  start = vi.fn();
}

describe('ORV-77 application preview routing', () => {
  it.each([
    ['external', 'youtube-external', true, false],
    ['local-only', 'youtube-local', false, true],
    ['builtin', 'builtin-song', false, false],
  ] as const)('%s uses the application caller classification', (kind, id, external, local) => {
    const source = new FakeSource();
    const route = classify(
      { id },
      (key: string) => external && key === id ? { id } : undefined,
      (key: string) => local && key === id ? { id } : undefined,
    );
    startPreview(source, route, 468);
    expect(source.loop).toBe(kind === 'builtin');
    expect(source.start).toHaveBeenCalledExactlyOnceWith(0, 8);
    if (kind === 'builtin') {
      expect(source.loopStart).toBe(8);
      expect(source.loopEnd).toBe(24);
    }
  });

  it('keeps native playback at offset zero without looping', () => {
    const source = new FakeSource();
    startPreview(source, 'native468', 468);
    expect(source.loop).toBe(false);
    expect(source.start).toHaveBeenCalledExactlyOnceWith(0, 0);
  });
});
