import { expect, test } from 'vitest';
import { LANGUAGES } from '../src/i18n';
import { PATCHES } from '../src/patch-notes';
import { PATCH_V0316 } from '../src/patch-notes-v0316';
import { PATCH_V0317 } from '../src/patch-notes-v0317';

test('0.3.17 retains its historical position and release date', () => {
  const index = PATCHES.indexOf(PATCH_V0317);
  expect(index).toBeGreaterThan(0);
  expect(PATCHES[index + 1]).toBe(PATCH_V0316);
  expect(PATCH_V0317.date).toBe('2026-11-11');
});

test('0.3.17 notes cover exactly thirteen languages with bounded local-play claims', () => {
  const languages = ['ko', 'en', 'zh', 'ja', 'es', 'fr', 'de', 'pt', 'it', 'ru', 'id', 'tr', 'vi'].sort();
  expect(Object.keys(LANGUAGES).sort()).toEqual(languages);
  expect(Object.keys(PATCH_V0317.notes).sort()).toEqual(languages);
  expect(PATCH_V0317.notes.en).toEqual([
    'Play locally saved songs with 4–8 keys, keep sessions and replays on this device, and share verified results. Replay audio must already be saved on the device.',
  ]);
  for (const notes of Object.values(PATCH_V0317.notes)) {
    expect(notes).toHaveLength(1);
    expect(notes[0].trim().length).toBeGreaterThan(0);
    expect(notes[0]).toContain('4–8');
    expect(notes[0]).not.toMatch(/YouTube|\b10\b|\blive\b|all tests|100%/i);
  }
});
