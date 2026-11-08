export interface ChartRatingFeatures {
  notes: number;
  nps: number;
  peakNps: number;
  chordShare: number;
  holdTimeShare: number;
  jackRate: number;
}
export type RatingScale = 'standard' | 'sc';
export const RATING_REFS: Record<
  RatingScale,
  {
    nps: number;
    peakNps: number;
    chordShare: number;
    holdTimeShare: number;
    jackRate: number;
  }
>;
export const RATING_WEIGHTS: {
  nps: number;
  peakNps: number;
  chord: number;
  hold: number;
  jack: number;
};
export function chartFeatures(
  notes: { time: number; lane: number; end?: number }[],
  durationSec: number,
): ChartRatingFeatures;
export function rateFeatures(
  f: ChartRatingFeatures,
  scale: RatingScale,
): number;
export function rateDifficulty(
  notes: { time: number; lane: number; end?: number }[],
  durationSec: number,
  scale: RatingScale,
): number;
