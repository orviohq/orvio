import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { APP_VERSION } from "../src/app-version";
import { LANGUAGES, type Language } from "../src/i18n";
import { patchGroups } from "../src/patch-groups";
import { PATCHES } from "../src/patch-notes";
import { PATCH_V0318 } from "../src/patch-notes-v0318";
import { PATCH_V0319 } from "../src/patch-notes-v0319";

test("0.3.19 retains its historical position and release date", () => {
 const index=PATCHES.indexOf(PATCH_V0319);expect(index).toBeGreaterThan(0);expect(PATCHES[index+1]).toBe(PATCH_V0318);expect(PATCH_V0319.date).toBe("2026-11-11");
});

test("0.3.19 notes cover exactly thirteen languages with one bounded bug fix each", () => {
  const languages = [
    "ko",
    "en",
    "zh",
    "ja",
    "es",
    "fr",
    "de",
    "pt",
    "it",
    "ru",
    "id",
    "tr",
    "vi",
  ].sort();
  expect(Object.keys(LANGUAGES).sort()).toEqual(languages);
  expect(Object.keys(PATCH_V0319.notes).sort()).toEqual(languages);
  expect(Object.keys(PATCH_V0319.notes).sort()).toEqual(
    Object.keys(PATCH_V0318.notes).sort(),
  );
  expect(PATCH_V0319.notes.en).toEqual([
    "Fixed result sharing in client-only mode so the copied link retains the result and replay.",
  ]);
  for (const notes of Object.values(PATCH_V0319.notes)) {
    expect(notes).toHaveLength(1);
    expect(notes[0].trim().length).toBeGreaterThan(0);
    expect(notes[0]).not.toMatch(
      /\bORV[\s-]*\d+|4[–-]8|\b10\b|\blive\b|all tests|100%|all bugs|all songs|verified results|performance|security/i,
    );
  }
});

test("0.3.19 groups every translation as fixes only", () => {
  for (const language of Object.keys(PATCH_V0319.notes) as Language[]) {
    const notes = PATCH_V0319.notes[language];
    expect(patchGroups(PATCH_V0319.version, language, notes)).toEqual({
      features: [],
      fixes: notes,
    });
  }
});
