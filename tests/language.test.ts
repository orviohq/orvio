import { test, expect } from 'vitest';
import { browserLanguage, resolvedLanguage } from '../src/language';
test('browser preferences use first supported BCP47 base, fallback English, manual override explicit', () => {
  expect(browserLanguage(['fr-FR', 'zh-Hant-TW', 'ko'])).toBe('zh');
  expect(browserLanguage(['DE', 'es-MX'])).toBe('es');
  expect(browserLanguage([])).toBe('en');
  expect(resolvedLanguage({ language: 'ko' }, ['es'])).toBe('es');
  expect(
    resolvedLanguage({ language: 'ko', languageMode: 'manual' }, ['es']),
  ).toBe('ko');
  expect(
    resolvedLanguage({ language: 'xx', languageMode: 'manual' }, ['es']),
  ).toBe('es');
});
