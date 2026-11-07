import { test, expect } from 'vitest';
import { PATCHES } from '../src/patch-notes';
import { LANGUAGES, type Language } from '../src/i18n';
import { patchGroups, GROUP_LABELS } from '../src/patch-groups';
test('all versions and thirteen languages are grouped without losing or changing historical entries', () => {
  for (const p of PATCHES)
    for (const lang of Object.keys(LANGUAGES) as Language[]) {
      const notes = p.notes[lang];
      const grouped = patchGroups(p.version, lang, notes);
      expect([...grouped.features, ...grouped.fixes].sort()).toEqual(
        [...notes].sort(),
      );
      expect(GROUP_LABELS[lang].features).toBeTruthy();
      expect(GROUP_LABELS[lang].fixes).toBeTruthy();
    }
});
