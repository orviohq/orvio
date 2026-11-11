import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LANGUAGES, translations } from '../src/i18n';

const languages = Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[];
const mainSource = readFileSync(
  new URL('../src/main.ts', import.meta.url),
  'utf8',
);

describe('ORV-88 game options hint', () => {
  it('removes the static next-play hint from all thirteen locales', () => {
    expect(languages).toHaveLength(13);
    for (const language of languages) {
      expect(translations[language]).not.toHaveProperty('optionHint');
    }
    expect(mainSource).not.toContain("'optionHint'");
    expect(mainSource).not.toContain("label('optionHint')");
  });

  it('keeps the live during-play hint in all thirteen locales', () => {
    for (const language of languages) {
      expect(
        translations[language].liveOptionHint.trim().length,
      ).toBeGreaterThan(0);
    }
  });

  it('renders the hint empty and hidden until a play is active', () => {
    expect(mainSource).toContain(
      '<p class="hint hidden" id="option-hint"></p>',
    );
    const updates = [
      ...mainSource.matchAll(
        /const optionHint = \$\('#option-hint'\);\s*optionHint\.textContent = optionsDuringPlay \? t\('liveOptionHint'\) : '';\s*optionHint\.classList\.toggle\('hidden', !optionsDuringPlay\);/g,
      ),
    ];
    expect(updates).toHaveLength(2);
  });
});
