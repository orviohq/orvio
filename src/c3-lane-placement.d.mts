import type { Analysis } from './sample-analyzer.mjs';
export function fixedLaneMap(
  analysis: Analysis,
  times: number[],
  lanes: 5 | 7,
  scale: unknown,
  info: unknown,
): {
  map: Map<number, number>;
  moves: { time: number; from: number; to: number }[];
  residual: number[];
};
