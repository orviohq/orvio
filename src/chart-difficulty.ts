import { rateDifficulty } from './chart-rating.mjs';
import type { Language } from './i18n';
import type { Note } from './chart';
/** A4: existing six keys keep their IDs; the two SC keys are additive. */
export type FamilyChartKey =
  '5:low' | '5:mid' | '5:high' | '5:sc' | '7:low' | '7:mid' | '7:high' | '7:sc';
export const FAMILY_CHART_KEYS: FamilyChartKey[] = [
  '5:low',
  '5:mid',
  '5:high',
  '5:sc',
  '7:low',
  '7:mid',
  '7:high',
  '7:sc',
];
export const CHART_FAMILIES = ['NM', 'HD', 'MX', 'SC'] as const;
export type ChartFamily = (typeof CHART_FAMILIES)[number];
/** Family is metadata only; it never renames or replaces a key. */
export function familyForKey(key: FamilyChartKey): ChartFamily {
  const tier = key.slice(2);
  return tier === 'low'
    ? 'NM'
    : tier === 'mid'
      ? 'HD'
      : tier === 'high'
        ? 'MX'
        : 'SC';
}
export interface ChartDifficultyMetadata {
  version: 1;
  family: ChartFamily | null;
  rating: { scale: 'standard' | 'sc'; level: number } | null;
  status: 'unrated' | 'rated';
}
export const UNRATED_CHART: Readonly<ChartDifficultyMetadata> = Object.freeze({
  version: 1,
  family: null,
  rating: null,
  status: 'unrated',
});
export function validDifficultyMetadata(
  raw: unknown,
): raw is ChartDifficultyMetadata {
  if (!raw || typeof raw !== 'object') return false;
  const m = raw as ChartDifficultyMetadata;
  if (
    m.version !== 1 ||
    (m.family !== null && !CHART_FAMILIES.includes(m.family))
  )
    return false;
  if (m.status === 'unrated') return m.rating === null;
  if (m.status !== 'rated' || m.family === null || !m.rating) return false;
  return (
    Number.isInteger(m.rating.level) &&
    m.rating.level >= 1 &&
    m.rating.level <= 15 &&
    m.rating.scale === (m.family === 'SC' ? 'sc' : 'standard')
  );
}
export function unratedChartSet(): Record<
  FamilyChartKey,
  ChartDifficultyMetadata
> {
  return Object.fromEntries(
    FAMILY_CHART_KEYS.map((k) => [k, structuredClone(UNRATED_CHART)]),
  ) as Record<FamilyChartKey, ChartDifficultyMetadata>;
}
/** Per-chart rating from the chart itself: the same chart rates the same everywhere. */
export function difficultyForChart(
  notes: Note[],
  durationSec: number,
  key: FamilyChartKey,
): ChartDifficultyMetadata {
  const family = familyForKey(key);
  const scale = family === 'SC' ? 'sc' : 'standard';
  return {
    version: 1,
    family,
    rating: { scale, level: rateDifficulty(notes, durationSec, scale) },
    status: 'rated',
  };
}
export function ratedChartSet(
  charts: Partial<Record<FamilyChartKey, Note[]>>,
  durationSec: number,
): Partial<Record<FamilyChartKey, ChartDifficultyMetadata>> {
  return Object.fromEntries(
    FAMILY_CHART_KEYS.filter((k) => charts[k] !== undefined).map((k) => [
      k,
      difficultyForChart(charts[k] as Note[], durationSec, k),
    ]),
  ) as Partial<Record<FamilyChartKey, ChartDifficultyMetadata>>;
}
/** Fail loud when decoration collapses: an SC chart identical to MX is not a variant. */
export function assertScDistinct(
  charts: Record<FamilyChartKey, Note[]>,
  lanes: 5 | 7,
) {
  const sc = JSON.stringify(charts[`${lanes}:sc`]);
  if (sc === JSON.stringify(charts[`${lanes}:high`]))
    throw new Error(`SC chart collapsed onto MX for ${lanes}K`);
}
const unrated: Record<Language, string> = {
  en: 'Unrated',
  ko: '미평가',
  zh: '未评级',
  ja: '未評価',
  es: 'Sin calificar',
  fr: 'Non évalué',
  de: 'Unbewertet',
  pt: 'Sem avaliação',
  it: 'Non valutato',
  ru: 'Без оценки',
  id: 'Belum dinilai',
  tr: 'Derecelendirilmedi',
  vi: 'Chưa xếp hạng',
};
/** The same pinned fields feed selection and result. Tier names never imply a family. */
export function difficultyText(
  metadata: ChartDifficultyMetadata | undefined,
  language: Language,
): string {
  const m = metadata ?? UNRATED_CHART;
  return m.rating && m.family
    ? `${m.family} ${m.rating.level}`
    : m.family
      ? `${m.family} · ${unrated[language]}`
      : unrated[language];
}
