import { test, expect } from 'vitest';
import { PATCHES, PATCH_LABELS } from '../src/patch-notes';
import { LANGUAGES } from '../src/i18n';
import { keyLabel } from '../src/key-label';
import { readFileSync } from 'node:fs';
test('all release versions have all thirteen nonempty translations and latest matches package', () => {
  const versions = [
    ...readFileSync('CHANGELOG.md', 'utf8').matchAll(
      /^## \[(\d+\.\d+\.\d+)\]/gm,
    ),
  ].map((m) => m[1]);
  expect(PATCHES.map((p) => p.version)).toEqual(versions);
  expect(PATCHES[0].version).toBe(
    JSON.parse(readFileSync('package.json', 'utf8')).version,
  );
  for (const p of PATCHES)
    for (const l of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
      expect(p.notes[l].length).toBeGreaterThan(0);
      expect(PATCH_LABELS[l].title.length).toBeGreaterThan(0);
    }
});
test('physical bindings retain readable symbols', () => {
  for (const [code, label] of Object.entries({
    Space: '␣',
    Comma: ',',
    Period: '.',
    Slash: '/',
    Semicolon: ';',
    KeyA: 'A',
    Digit1: '1',
  }))
    expect(keyLabel(code)).toBe(label);
});
