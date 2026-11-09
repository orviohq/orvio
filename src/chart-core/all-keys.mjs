// Unified all-key chart core.
//
// The shared rhythm extraction / tier selection / decoration / placement /
// repair / adaptation functions come from ./shared.mjs, generated verbatim from
// the frozen reference engine with three no-op-for-5/7 lane generalizations.
// This module is the *serving* path: the compatibility exports
// generateC3RuntimeState11 / generateRecordFromAnalysis build 5/7 from the same
// code as 4/6/8, not from a copied old function.
//
// Version identity:
//   - LEGACY_ANALYZER_VERSION is emitted only by the 5/7 compatibility path so
//     existing 5/7 record/chart identities stay bitwise identical.
//   - UNIFIED_CORE_VERSION is a NEW id used by the all-key surface. It can never
//     relabel old generated output.

import { sha256 } from '@noble/hashes/sha2.js';

import {
  analyzeV4,
  computeBandMags,
  makeOnsetInfo,
  analyzePcm2,
  chartFromAnalysis,
  chartFromPoolV4,
  assignLanesV3,
  decorateTier,
  repairSameLaneJacks,
  adaptDecoratedChart,
  analyzePcm,
  difficultyForChart,
  C3_SC_PARAMS,
} from './shared.mjs';
import { HANN, WRE, WIM } from './tables.mjs';

export const LEGACY_ANALYZER_VERSION =
  'research-c3-c2-a35local-fill-lanev3-budget-v1-jackrepair150-hold-chord-tail20-union-v3';

// New surface id. Deliberately different from LEGACY_ANALYZER_VERSION.
export const UNIFIED_CORE_VERSION =
  'allkeys-c3-a35local-fill-lanev3-budget-v1-jackrepair150-hold-chord-tail20-union-v1';

export const ALL_KEYS_VERSION = UNIFIED_CORE_VERSION;
export const ALL_KEYS_LANES = Object.freeze([4, 5, 6, 7, 8]);
export const ALL_KEYS_TIERS = Object.freeze(['low', 'mid', 'high', 'sc']);
export const ALL_KEYS_CHART_KEYS = Object.freeze(
  ALL_KEYS_LANES.flatMap((lanes) =>
    ALL_KEYS_TIERS.map((tier) => `${lanes}:${tier}`),
  ),
);

export const LEGACY_LANES = Object.freeze([5, 7]);
export const LEGACY_TIERS = Object.freeze(['low', 'mid', 'high', 'sc']);
const LEGACY_CHART_KEYS = Object.freeze([
  '5:low',
  '5:mid',
  '5:high',
  '7:low',
  '7:mid',
  '7:high',
]);

const LEGACY_CONFIG = JSON.stringify({
  mono: 'left-to-right-mean',
  analysisSampleRate: 22050,
  hop: 512,
  window: 1024,
  onset: 'table-stft-band-flux-c2-a35localfloor',
  selection: 'nested-c2-high-gap0.10-burst8-a35poolfill-pace',
  grid: 'none',
  decoration: 'm17c-band-sustain-hold-chord-tail20',
  tailClipMargin: 0.2,
  lanePlacement:
    'a35-lanev3-budget-v1-adaptive-share-lru-guard120ms+jackrepair150-postpass',
  highMode: 'c2',
  sc: 'a4-sc-chordcap30-hold-emphasis-v1',
});

const UNIFIED_CONFIG = JSON.stringify({
  mono: 'left-to-right-mean',
  analysisSampleRate: 22050,
  hop: 512,
  window: 1024,
  onset: 'table-stft-band-flux-c2-a35localfloor',
  selection: 'nested-c2-high-gap0.10-burst8-a35poolfill-pace',
  grid: 'none',
  decoration: 'm17c-band-sustain-hold-chord-tail20',
  tailClipMargin: 0.2,
  lanePlacement:
    'a35-lanev3-budget-v1-adaptive-share-lru-guard120ms+jackrepair150-postpass-allkeys',
  highMode: 'c2',
  sc: 'a4-sc-chordcap30-hold-emphasis-v1',
  keys: '4,5,6,7,8',
});

const SUPPORTED_LANES = new Set([4, 5, 6, 7, 8]);

function sha256Hex(value) {
  return Array.from(
    sha256(typeof value === 'string' ? new TextEncoder().encode(value) : value),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}

function notesSha256(notes) {
  return sha256Hex(JSON.stringify(notes));
}

function assertLanes(lanes) {
  if (!Array.isArray(lanes) || !lanes.length)
    throw new Error('lanes must be a non-empty array');
  if (!lanes.every((l) => SUPPORTED_LANES.has(l)))
    throw new Error('unsupported lanes: ' + lanes.join(','));
  if (new Set(lanes).size !== lanes.length)
    throw new Error('duplicate lanes: ' + lanes.join(','));
}

// Shared construction core. Identical arithmetic to reference
// generateC3RuntimeState11 for lanes [5,7]; lane placement/decoration are
// parameterized by the requested key count.
function buildState(samples, rate, lanesList, analyzerVersion, options = {}) {
  const collectConstraints = options.instrument === true;
  const constraintLog = collectConstraints ? {} : null;
  const analysis = analyzeV4(samples, rate);
  const bands = computeBandMags(samples, rate, { HANN, WRE, WIM });
  const info = makeOnsetInfo(analysis, bands);
  const raw = {},
    charts = {};
  const peaks = [...analysis.peaks].sort((x, y) => x.time - y.time);
  const strs = peaks.map((p) => p.strength);
  const gs = [...strs].sort((x, y) => x - y);
  const globalFloor = gs[Math.floor(gs.length * 0.15)] || 0;
  const pool = peaks.filter((p) => {
    const win = [];
    for (const q of peaks) {
      if (q.time < p.time - 9) continue;
      if (q.time > p.time + 9) break;
      win.push(q.strength);
    }
    win.sort((x, y) => x - y);
    return (
      p.strength >=
      Math.min(globalFloor, win[Math.floor(win.length * 0.15)] || 0)
    );
  });
  const a2 = analyzePcm2(samples, rate, analysis);
  const repairLog = {};
  for (const lanes of lanesList) {
    const v2tierTimes = {};
    for (const tier of ['low', 'mid', 'high'])
      v2tierTimes[tier] = chartFromAnalysis(a2, tier, lanes).map((n) => n.time);
    const bundle = chartFromPoolV4(analysis, pool, v2tierTimes, lanes);
    const tierNotes = {};
    for (const tier of ['low', 'mid', 'high']) tierNotes[tier] = bundle[tier];
    const high = tierNotes.high.map((n) => n.time);
    const evPeaks = [
      ...new Map(tierNotes.high.map((n) => [n.peak.time, n.peak])).values(),
    ];
    const { laneMap: evLaneMap, size } = assignLanesV3(
      evPeaks,
      analysis,
      lanes,
    );
    const laneMap = new Map(
      tierNotes.high.map((n) => [n.time, evLaneMap.get(n.peak.time)]),
    );
    for (const [tier, notes] of Object.entries(tierNotes)) {
      const base = notes.map((n) => {
        const lane = laneMap.get(n.time);
        if (lane === void 0) throw Error('Missing inherited lane');
        return { time: n.time, lane };
      });
      const tierLog = collectConstraints ? {} : null;
      raw[`${lanes}:${tier}`] = collectConstraints
        ? decorateTier(base, tier, info, lanes, void 0, tierLog)
        : decorateTier(base, tier, info, lanes);
      if (collectConstraints) constraintLog[`${lanes}:${tier}`] = tierLog.log;
    }
    const scBase = high.map((time) => {
      const lane = laneMap.get(time);
      if (lane === void 0) throw Error('Missing inherited lane');
      return { time, lane };
    });
    const scLog = collectConstraints ? {} : null;
    raw[`${lanes}:sc`] = collectConstraints
      ? decorateTier(scBase, 'sc', info, lanes, C3_SC_PARAMS, scLog)
      : decorateTier(scBase, 'sc', info, lanes, C3_SC_PARAMS);
    if (collectConstraints) constraintLog[`${lanes}:sc`] = scLog.log;
    repairLog[lanes] = repairSameLaneJacks(raw, lanes);
    for (const k of [
      `${lanes}:low`,
      `${lanes}:mid`,
      `${lanes}:high`,
      `${lanes}:sc`,
    ])
      charts[k] = adaptDecoratedChart(raw[k], lanes, samples.length / rate);
    charts.laneSizes = charts.laneSizes || {};
    charts.laneSizes[lanes] = size;
  }
  const result = {
    raw,
    charts,
    duration: samples.length / rate,
    analysis,
    repairLog,
    analyzerVersion,
  };
  if (collectConstraints) result.constraintLog = constraintLog;
  return result;
}

// Compatibility export: same name/shape as the reference engine. With no
// options it is the exact 5/7 legacy state (including analyzerVersion).
export function generateC3RuntimeState11(samples, rate, options = {}) {
  const lanes = options.lanes ?? LEGACY_LANES;
  assertLanes(lanes);
  const legacy = lanes.every((l) => l === 5 || l === 7);
  return buildState(
    samples,
    rate,
    [...lanes],
    legacy ? LEGACY_ANALYZER_VERSION : UNIFIED_CORE_VERSION,
    { instrument: options.instrument === true },
  );
}

// New public surface for integration: generic key list, new version id.
export function generateUnifiedState(samples, rate, options = {}) {
  const lanes = options.lanes ?? ALL_KEYS_LANES;
  assertLanes(lanes);
  return buildState(samples, rate, [...lanes], UNIFIED_CORE_VERSION, {
    instrument: options.instrument === true,
  });
}

// Integrator-facing chart API. `parsed` is the pinned analysis input
// ({samples: Float32Array @22050, sampleRate, frames}); analysis always runs at
// 22050 exactly like the reference pipeline.
//
// Instrumentation is ON by default here (constraintLog); pass
// `{instrument:false}` to opt out. It never changes chart arithmetic.
export function generateUnifiedCharts(parsed, options = {}) {
  if (!parsed || !(parsed.samples instanceof Float32Array))
    throw new Error(
      'generateUnifiedCharts requires parsed.samples Float32Array',
    );
  const lanes = options.lanes ?? ALL_KEYS_LANES;
  const instrument = options.instrument !== false;
  const state = generateUnifiedState(parsed.samples, 22050, {
    lanes,
    instrument,
  });
  return {
    charts: state.charts,
    duration: state.duration,
    analysis: state.analysis,
    repairLog: state.repairLog,
    constraintLog: instrument ? state.constraintLog : null,
  };
}

export function generateAllKeysState(samples, rate, options = {}) {
  const lanes = options.lanes ?? ALL_KEYS_LANES;
  const state = generateUnifiedState(samples, rate, {
    lanes,
    instrument: options.instrument === true,
  });
  return { ...state, version: UNIFIED_CORE_VERSION, lanes: [...lanes] };
}

// ---------------------------------------------------------------------------
// Legacy 5/7 record assembly (bitwise identical to reference).
// ---------------------------------------------------------------------------

function legacyPresentChartKeys(record) {
  return [
    ...LEGACY_CHART_KEYS,
    ...['5:sc', '7:sc'].filter((key) => record.charts[key] !== void 0),
  ];
}

async function legacyChartSetHash(record) {
  const payload = JSON.stringify({
    analyzer: record.analyzerVersion,
    config: record.config,
    charts: legacyPresentChartKeys(record).map((key) => [
      key,
      record.charts[key].sha256,
    ]),
    ...(record.chartMetadata ? { chartMetadata: record.chartMetadata } : {}),
  });
  return sha256Hex(new TextEncoder().encode(payload));
}

async function verifyLegacyHashes(record) {
  if (record.chartSetSha256 !== (await legacyChartSetHash(record)))
    return false;
  for (const key of legacyPresentChartKeys(record)) {
    if (record.charts[key].sha256 !== notesSha256(record.charts[key].notes))
      return false;
  }
  return true;
}

export async function generateRecordFromAnalysis(parsed, videoId, audioSha256) {
  const samples = parsed.samples,
    generated = generateC3RuntimeState11(samples, 22050),
    summary = analyzePcm(samples, 22050);
  const charts = {},
    chartMetadata = {};
  for (const lanes of LEGACY_LANES)
    for (const difficulty of LEGACY_TIERS) {
      const notes = generated.charts[`${lanes}:${difficulty}`];
      if (
        difficulty === 'sc' &&
        JSON.stringify(notes) ===
          JSON.stringify(generated.charts[`${lanes}:high`])
      )
        continue;
      chartMetadata[`${lanes}:${difficulty}`] = difficultyForChart(
        notes,
        generated.duration,
        `${lanes}:${difficulty}`,
      );
      charts[`${lanes}:${difficulty}`] = {
        notes,
        sha256: notesSha256(notes),
      };
    }
  const record = {
    version: 1,
    videoId,
    audioSha256,
    sampleRate: parsed.sampleRate,
    estimatedBpm: summary.bpm,
    frames: parsed.frames,
    pipelineVersion: 'pcm16-stereo44100-48000-linear-v1',
    analyzerVersion: generated.analyzerVersion,
    config: LEGACY_CONFIG,
    charts,
    chartMetadata,
  };
  record.chartSetSha256 = await legacyChartSetHash(record);
  if (!(await verifyLegacyHashes(record)))
    throw Error('Invalid generated chart');
  return record;
}

// ---------------------------------------------------------------------------
// New all-key record surface. NEW version id; never relabels 5/7 legacy output.
// ---------------------------------------------------------------------------

function unifiedPresentChartKeys(record) {
  return ALL_KEYS_CHART_KEYS.filter((key) => record.charts[key] !== void 0);
}

async function unifiedChartSetHash(record) {
  const payload = JSON.stringify({
    analyzer: record.analyzerVersion,
    config: record.config,
    charts: unifiedPresentChartKeys(record).map((key) => [
      key,
      record.charts[key].sha256,
    ]),
    chartMetadata: record.chartMetadata,
  });
  return sha256Hex(new TextEncoder().encode(payload));
}

export async function generateAllKeysRecordFromAnalysis(
  parsed,
  videoId,
  audioSha256,
  options = {},
) {
  const lanes = options.lanes ?? ALL_KEYS_LANES;
  assertLanes(lanes);
  const samples = parsed.samples,
    generated = generateUnifiedState(samples, 22050, { lanes }),
    summary = analyzePcm(samples, 22050);
  const charts = {},
    chartMetadata = {};
  for (const laneCount of lanes)
    for (const difficulty of ALL_KEYS_TIERS) {
      const key = `${laneCount}:${difficulty}`;
      const notes = generated.charts[key];
      chartMetadata[key] = difficultyForChart(notes, generated.duration, key);
      charts[key] = { notes, sha256: notesSha256(notes) };
    }
  const record = {
    version: 3,
    videoId,
    audioSha256,
    sampleRate: parsed.sampleRate,
    estimatedBpm: summary.bpm,
    frames: parsed.frames,
    pipelineVersion: 'allkeys-pinned-pcm16-48k-v1',
    analyzerVersion: UNIFIED_CORE_VERSION,
    config: UNIFIED_CONFIG,
    lanes: [...lanes],
    charts,
    chartMetadata,
  };
  record.chartSetSha256 = await unifiedChartSetHash(record);
  return record;
}
