import type { Language } from './i18n';
const retry: Record<Language, string> = {
  en: 'Try again',
  ko: '다시 시도',
  zh: '重试',
  ja: '再試行',
  es: 'Reintentar',
  fr: 'Réessayer',
  de: 'Erneut versuchen',
  pt: 'Tentar de novo',
  it: 'Riprova',
  ru: 'Повторить',
  id: 'Coba lagi',
  tr: 'Tekrar dene',
  vi: 'Thử lại',
};
export const importRetryLabel = (language: Language) => retry[language];
