import type { Analysis } from './sample-analyzer.mjs';
import type { DecoratedNote } from './external-chart-adapter';
export function computeBandMags(
  samples: Float32Array,
  rate: number,
  tables: unknown,
): unknown;
export function makeOnsetInfo(
  analysis: Analysis,
  bands: unknown,
): { scale: unknown };
export function assignLanes(
  analysis: Analysis,
  times: number[],
  lanes: 5 | 7,
  scale: unknown,
): Map<number, number>;
export function denseHighSelection(
  analysis: Analysis,
  seed: Analysis['peaks'],
): Analysis['peaks'];
export function decorateTier(
  notes: { time: number; lane: number }[],
  tier: 'low' | 'mid' | 'high' | 'sc',
  info: unknown,
  lanes: 5 | 7,
  params?: unknown,
): DecoratedNote[];
export const C3_SC_PARAMS: unknown;
