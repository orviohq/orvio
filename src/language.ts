import { LANGUAGES, type Language } from './i18n';
export function browserLanguage(preferred: readonly string[]): Language {
  for (const language of preferred) {
    const base = language.toLowerCase().split('-')[0];
    if (base in LANGUAGES) return base as Language;
  }
  return 'en';
}
export function resolvedLanguage(
  saved: { language?: string; languageMode?: string },
  preferred: readonly string[],
): Language {
  return saved.languageMode === 'manual' &&
    saved.language &&
    saved.language in LANGUAGES
    ? (saved.language as Language)
    : browserLanguage(preferred);
}
