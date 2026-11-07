export interface Analysis {
  duration: number;
  bpm: number;
  peaks: { time: number; strength: number }[];
  [key: string]: unknown;
}
export function analyzePcm(samples: Float32Array, sampleRate: number): Analysis;
export function chartFromAnalysis(
  analysis: Analysis,
  difficulty: 'low' | 'mid' | 'high',
  lanes: 5 | 7,
): import('./chart').Note[];
