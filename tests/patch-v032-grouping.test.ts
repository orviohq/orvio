import { expect, it } from 'vitest';
import { patchGroups } from '../src/patch-groups';
import { PATCH_V0302 } from '../src/patch-notes-v0302';
import type { Language } from '../src/i18n';
it('all translated 0.3.2 release notes are bug fixes, not added features', () => {
  for (const lang of Object.keys(PATCH_V0302.notes) as Language[]) {
    const notes = PATCH_V0302.notes[lang];
    expect(patchGroups('0.3.2', lang, notes)).toEqual({
      features: [],
      fixes: notes,
    });
  }
});
