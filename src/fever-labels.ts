import type { Language } from './i18n';
export const FEVER_LABELS: Record<Language, { option: string; rules: string }> =
  {
    en: { option: 'Automatic FEVER', rules: 'Orvio rules' },
    ko: { option: '자동 피버', rules: 'Orvio 자체 기준' },
    zh: { option: '自动 FEVER', rules: 'Orvio 规则' },
    ja: { option: '自動FEVER', rules: 'Orvio独自ルール' },
    es: { option: 'FEVER automático', rules: 'Reglas de Orvio' },
    fr: { option: 'FEVER automatique', rules: 'Règles Orvio' },
    de: { option: 'Automatisches FEVER', rules: 'Orvio-Regeln' },
    pt: { option: 'FEVER automático', rules: 'Regras do Orvio' },
    it: { option: 'FEVER automatico', rules: 'Regole Orvio' },
    ru: { option: 'Автоматический FEVER', rules: 'Правила Orvio' },
    id: { option: 'FEVER otomatis', rules: 'Aturan Orvio' },
    tr: { option: 'Otomatik FEVER', rules: 'Orvio kuralları' },
    vi: { option: 'FEVER tự động', rules: 'Quy tắc Orvio' },
  };
