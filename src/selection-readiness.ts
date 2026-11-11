import type { Difficulty } from './chart';
import type { Language } from './i18n';

/** Extension chart generation is one immutable all-mode record. Selection is
 * only the initial verification slot, never a per-key generation trigger. */
export const EXTENSION_LANES = Object.freeze([4, 6, 8] as const);
export const EXTENSION_READINESS_SELECTION = Object.freeze({
  lanes: 4 as const,
  difficulty: 'low' as Difficulty,
});

export interface ReadinessCandidate {
  id: string;
  generation?: 'legacy' | 'unified';
  pending: boolean;
  deferred: boolean;
  failed: boolean;
}

/** Choose the already-restored/imported sources that still need one all-mode
 * extension preparation. This is invoked at library/import readiness, never
 * from a key-count or difficulty click. */
export function planGeneralReadiness(
  candidates: readonly ReadinessCandidate[],
): string[] {
  const planned: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (
      !candidate.id ||
      seen.has(candidate.id) ||
      candidate.generation === 'unified' ||
      candidate.pending ||
      candidate.deferred ||
      candidate.failed
    )
      continue;
    seen.add(candidate.id);
    planned.push(candidate.id);
  }
  return planned;
}

/** Chart preparation is source-level readiness, never an audio reload claim. */
const chartPreparing: Record<Language, string> = {
  en: 'Preparing chart…',
  ko: '차트를 준비하고 있습니다…',
  zh: '正在准备谱面…',
  ja: '譜面を準備中…',
  es: 'Preparando mapa…',
  fr: 'Préparation de la partition…',
  de: 'Notenkarte wird vorbereitet…',
  pt: 'Preparando mapa…',
  it: 'Preparazione della mappa…',
  ru: 'Подготовка схемы…',
  id: 'Menyiapkan chart…',
  tr: 'Nota haritası hazırlanıyor…',
  vi: 'Đang chuẩn bị bản nhạc…',
};
export function chartPreparingLabel(language: Language) {
  return chartPreparing[language];
}
