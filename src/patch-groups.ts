import type { Language } from './i18n';
export const GROUP_LABELS: Record<
  Language,
  { features: string; fixes: string; none: string }
> = {
  en: {
    features: 'Features and improvements',
    fixes: 'Bug fixes',
    none: 'No separate entries recorded.',
  },
  ko: {
    features: '기능 개선 / 추가',
    fixes: '버그 수정',
    none: '별도 기록 없음',
  },
  zh: { features: '功能改进 / 新增', fixes: '错误修复', none: '无单独记录' },
  ja: {
    features: '機能改善・追加',
    fixes: '不具合修正',
    none: '個別の記録なし',
  },
  es: {
    features: 'Funciones y mejoras',
    fixes: 'Correcciones de errores',
    none: 'Sin entradas separadas.',
  },
  fr: {
    features: 'Fonctionnalités et améliorations',
    fixes: 'Corrections de bugs',
    none: 'Aucune entrée distincte.',
  },
  de: {
    features: 'Funktionen und Verbesserungen',
    fixes: 'Fehlerbehebungen',
    none: 'Keine gesonderten Einträge.',
  },
  pt: {
    features: 'Funcionalidades e melhorias',
    fixes: 'Correções de erros',
    none: 'Sem registos separados.',
  },
  it: {
    features: 'Funzioni e miglioramenti',
    fixes: 'Correzioni di errori',
    none: 'Nessuna voce separata.',
  },
  ru: {
    features: 'Функции и улучшения',
    fixes: 'Исправления ошибок',
    none: 'Отдельных записей нет.',
  },
  id: {
    features: 'Fitur dan peningkatan',
    fixes: 'Perbaikan bug',
    none: 'Tidak ada catatan terpisah.',
  },
  tr: {
    features: 'Özellikler ve iyileştirmeler',
    fixes: 'Hata düzeltmeleri',
    none: 'Ayrı kayıt yok.',
  },
  vi: {
    features: 'Tính năng và cải tiến',
    fixes: 'Sửa lỗi',
    none: 'Không có mục riêng.',
  },
};
// Existing translated paragraphs stay verbatim. Multi-purpose historical notes
// are grouped by their main change rather than inventing new release claims.
export function patchGroups(version: string, lang: Language, notes: string[]) {
  const extra = !['en', 'ko', 'zh', 'ja', 'es'].includes(lang);
  const fixes: Record<string, number[]> = {
    '0.2.9': [1, 2],
    '0.2.8': [0, 1],
    '0.2.7': [],
    '0.2.6': extra ? [2] : [0, 3],
    '0.2.5': [],
    '0.2.4': [0],
    '0.2.3': [1],
    '0.2.2': [],
    '0.2.1': [0],
    '0.2.0': [0],
    '0.1.0': [],
  };
  const indexes = fixes[version] || [];
  return {
    features: notes.filter((_, i) => !indexes.includes(i)),
    fixes: notes.filter((_, i) => indexes.includes(i)),
  };
}
