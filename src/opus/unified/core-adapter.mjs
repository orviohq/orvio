import { generateUnifiedCharts } from '../../chart-core/index.mjs';
import { OPUS468_CHART_KEYS } from './extension-constants.mjs';
export function generateUnified468Charts(parsed) {
  if (
    !parsed ||
    !(parsed.samples instanceof Float32Array) ||
    !parsed.samples.length ||
    parsed.sampleRate !== 48000 ||
    !Number.isSafeInteger(parsed.frames) ||
    parsed.frames < 1 ||
    parsed.frames > 14400000 ||
    parsed.samples.length !== Math.floor(parsed.frames / (48000 / 22050))
  )
    throw Error('opus468_pcm_shape');
  const result = generateUnifiedCharts(parsed, {
    lanes: [4, 6, 8],
    instrument: false,
  });
  return {
    ...result,
    charts: Object.fromEntries(
      OPUS468_CHART_KEYS.map((k) => [k, result.charts[k]]),
    ),
  };
}
