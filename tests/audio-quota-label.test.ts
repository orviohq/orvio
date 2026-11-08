import { it, expect } from 'vitest';
import { AUDIO_QUOTA_LABEL } from '../src/audio-quota-label';
import { LANGUAGES } from '../src/i18n';
import { PATCH_V024 } from '../src/patch-notes-v024';
it('shows the existing IP daily 100 audio limit in every locale without inventing other caps', () => {
  expect(Object.keys(AUDIO_QUOTA_LABEL).sort()).toEqual(
    Object.keys(LANGUAGES).sort(),
  );
  for (const [language, text] of Object.entries(AUDIO_QUOTA_LABEL)) {
    expect(text).toContain('100');
    expect(text).toContain('IP');
    expect(text).not.toMatch(/10 min|10분|40|unlimited/i);
    expect(
      PATCH_V024.notes[language as keyof typeof AUDIO_QUOTA_LABEL],
    ).toEqual([text]);
  }
});
