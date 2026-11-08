import { it, expect } from 'vitest';
import { PATCHES } from '../src/patch-notes';
import { readFileSync } from 'node:fs';
it('public release notes in every language and changelog omit private request numbers', () => {
  for (const patch of PATCHES)
    for (const notes of Object.values(patch.notes))
      for (const note of notes) expect(note).not.toMatch(/\bA\d{1,3}\b/);
  expect(readFileSync('CHANGELOG.md', 'utf8')).not.toMatch(/\bA\d{1,3}\b/);
});
