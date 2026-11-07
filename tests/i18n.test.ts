import { it, expect } from 'vitest';
import { LANGUAGES, translations } from '../src/i18n';
it('all five selectable languages have complete nonempty UI keys', () => {
  const keys = Object.keys(translations.en).sort();
  for (const lang of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]) {
    expect(Object.keys(translations[lang]).sort()).toEqual(keys);
    expect(
      Object.values(translations[lang]).every((v) => v.trim().length > 0),
    ).toBe(true);
  }
});
