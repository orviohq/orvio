// Public surface for the unified all-key core.
//
// Default 5/7 compatibility:
//   generateC3RuntimeState11(samples, rate)          -> exact legacy state
//   generateRecordFromAnalysis(parsed, id, sha)      -> exact legacy record
//
// New key-count-parameterized surface (NEW version id):
//   generateUnifiedCharts(parsed, {lanes:[4,5,6,7,8]})
//   generateC3RuntimeState11(samples, rate, {lanes})
//   generateUnifiedState(samples, rate, {lanes})
//   generateAllKeysState(samples, rate, {lanes})
//   generateAllKeysRecordFromAnalysis(parsed, id, sha, {lanes})

export {
  UNIFIED_CORE_VERSION,
  ALL_KEYS_VERSION,
  LEGACY_ANALYZER_VERSION,
  ALL_KEYS_LANES,
  ALL_KEYS_TIERS,
  ALL_KEYS_CHART_KEYS,
  LEGACY_LANES,
  LEGACY_TIERS,
  generateC3RuntimeState11,
  generateUnifiedState,
  generateUnifiedCharts,
  generateAllKeysState,
  generateRecordFromAnalysis,
  generateAllKeysRecordFromAnalysis,
} from './all-keys.mjs';
