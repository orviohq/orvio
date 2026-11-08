import { fixedLaneMap } from './c3-lane-placement.mjs';
import { analyzePcm, chartFromAnalysis } from './flux-chart-research.mjs';
import { HANN, WRE, WIM } from './flux-tables.mjs';
import * as Core from './c3-core.mjs';
import {
  adaptDecoratedChart,
  type DecoratedNote,
} from './external-chart-adapter';
import type { ChartKey } from './external-source';
import type { Note } from './chart';
/** New-chart generation only. Saved-record readers never run analysis. */
export function generateC3Runtime(
  samples: Float32Array,
  rate: number,
  highMode: 'c2' | 'dense' = 'c2',
  placement: 'original' | 'union-v3' = 'union-v3',
) {
  const analysis = analyzePcm(samples, rate);
  const bands = Core.computeBandMags(samples, rate, { HANN, WRE, WIM });
  const info = Core.makeOnsetInfo(analysis, bands);
  const raw = {} as Record<ChartKey, DecoratedNote[]>;
  const charts = {} as Record<ChartKey, Note[]>;
  for (const lanes of [5, 7] as const) {
    const low = chartFromAnalysis(analysis, 'low', lanes).map((n) => n.time);
    const mid = chartFromAnalysis(analysis, 'mid', lanes).map((n) => n.time);
    const high =
      highMode === 'c2'
        ? chartFromAnalysis(analysis, 'high', lanes).map((n) => n.time)
        : Core.denseHighSelection(
            analysis,
            analysis.peaks.filter((p) => mid.includes(p.time)),
          ).map((p) => p.time);
    const laneMap =
      placement === 'original'
        ? Core.assignLanes(analysis, high, lanes, info.scale)
        : fixedLaneMap(analysis, high, lanes, info.scale, info).map;
    for (const [tier, times] of [
      ['low', low],
      ['mid', mid],
      ['high', high],
    ] as const) {
      const base = times.map((time) => {
        const lane = laneMap.get(time);
        if (lane === undefined) throw Error('Missing inherited lane');
        return { time, lane };
      });
      const key = `${lanes}:${tier}` as ChartKey;
      raw[key] = Core.decorateTier(base, tier, info, lanes);
      charts[key] = adaptDecoratedChart(raw[key], lanes, samples.length / rate);
    }
  }
  return {
    raw,
    charts,
    duration: samples.length / rate,
    analysis,
    analyzerVersion: `research-c3-${highMode}-hold-chord-tail20-${placement === 'original' ? '2' : 'union-v3'}`,
    placement,
  };
}
