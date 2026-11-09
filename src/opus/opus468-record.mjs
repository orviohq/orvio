// opus468-record.mjs — NEW isolated 468 extension record assembly (ORV29 sub-scope).
//
// Assembles the orvio-opus-chart-extension-v1 / family 468-v1 record in the exact
// fixed field order and root names of the independent pure binding validator
// (opus-extension-binding.mjs, separate owner). This module does NOT import that
// validator: it mirrors the contract and self-checks against independently
// re-derived roots. Journal/DO authority is verified by the binding validator at
// integration time, never here.
//
// Contract preserved verbatim:
//  - kind orvio-opus-chart-extension-v1, version 1, family 468-v1
//  - roots in fixed order: videoId, baseSourceRecordSha256 (SHA256 of the RAW base
//    record JSON bytes, never reserialized), baseChartSetSha256, audioSha256,
//    audioDescriptorSha256, encodedAudioSha256, decoderWasmSha256, pipelineVersion,
//    frames, sampleRate, channels
//  - then generatorVersion, config (must equal the frozen base record config
//    verbatim), charts, chartMeta; extensionSha256 appended on the stored object
//  - exactly 12 ordered slots 4/6/8 x low/mid/high/sc in charts and chartMeta;
//    SC collapse marker {unavailable:'sc_collapsed_into_mx'} occupies its slot
//  - per-chart sha256 = SHA256 of UTF8 JSON of normalized notes; tier note caps
//    910/1270/2770/3130, total 24300, stored bytes <= 1572864
//  - no qualified generator identity is claimed: the shipped literal is a
//    labeled test-only value and old-family literals are rejected.
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { rateDifficulty } from '../chart-rating.mjs';
import { PIPELINE, DECODER } from './opus-descriptor.mjs';
import {
  OPUS468_CHART_KEYS,
  OPUS468_TIER_NOTE_CAP,
  OPUS468_MAX_TOTAL_NOTES,
  OPUS468_SC_MARKER,
} from './opus468-generator.mjs';

export const OPUS468_EXTENSION_KIND = 'orvio-opus-chart-extension-v1';
export const OPUS468_EXTENSION_FAMILY = '468-v1';
// Labeled test-only identity. Not a qualified generator: the binding validator
// fails closed unless trusted integration code lists this exact string, and old
// family literals are rejected outright.
// Labeled test-only identity that also truthfully names the actual 468 derive
// recipe (the contract binds config to the base record verbatim, so the recipe
// truth lives here): nested-c2 tier selection gap0.10/burst8, m17c band-sustain
// hold-chord-tail20 decoration, union-v3 lane placement mirrored to 468 groups.
// Not a qualified generator: the binding validator fails closed unless trusted
// integration code lists this exact string, and old family literals are rejected.
export const OPUS468_GENERATOR_VERSION =
  'opus468-testonly-c2nested-gap010-burst8-decor17c-union468-v0-unqualified';

// Fail-closed admission descriptor for a produced extension record. A record
// carrying a test-only generator identity is NOT admissible at any consuming
// boundary (persistence/install/share/play); the qualified-generator list
// defaults to [] and only trusted integration code may flip qualified to true
// AFTER actual producer qualification. Consumers must gate on this, not on
// worker success alone.
export function opus468Admission(
  record,
  trustedQualifiedGeneratorVersions = [],
) {
  const list = Array.isArray(trustedQualifiedGeneratorVersions)
    ? trustedQualifiedGeneratorVersions
    : [];
  const qualified =
    !!record &&
    typeof record.generatorVersion === 'string' &&
    list.includes(record.generatorVersion);
  return {
    qualified,
    qualifiedGeneratorVersions: list,
    persist: qualified,
    install: qualified,
    share: qualified,
    play: qualified,
    reason: qualified ? 'qualified-generator' : 'generator-not-qualified',
  };
}

const ROOTS = [
  'videoId',
  'baseSourceRecordSha256',
  'baseChartSetSha256',
  'audioSha256',
  'audioDescriptorSha256',
  'encodedAudioSha256',
  'decoderWasmSha256',
  'pipelineVersion',
  'frames',
  'sampleRate',
  'channels',
];
const TIER_FAMILY = { low: 'NM', mid: 'HD', high: 'MX', sc: 'SC' };
const MAX_STORED_BYTES = 1572864;
const TE = new TextEncoder();
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export const sha256Hex = (bytes) => hex(nobleSha256(bytes));
const sha = (s) => sha256Hex(TE.encode(s));
const HASH = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);

export function checkOpus468GeneratorVersion(
  generatorVersion,
  baseAnalyzerVersion,
) {
  if (
    typeof generatorVersion !== 'string' ||
    !generatorVersion ||
    generatorVersion.length > 128 ||
    generatorVersion.startsWith('research-c3') ||
    generatorVersion === 'orvio-current35-v1'
  )
    throw Error('opus468_generator_version');
  if (
    baseAnalyzerVersion !== undefined &&
    generatorVersion === baseAnalyzerVersion
  )
    throw Error('opus468_base_analyzer_is_not_extension_generator');
}

// Strict note normalization mirroring the binding validator: keys id,time,lane
// plus optional end; sequential ids, non-decreasing time, lane bounds, no
// same-lane overlap, end within duration.
function normalizeNotes468(raw, lanes, duration, tier) {
  if (
    !Array.isArray(raw) ||
    !raw.length ||
    raw.length > OPUS468_TIER_NOTE_CAP[tier]
  )
    throw Error('opus468_note_count_' + tier);
  const out = raw.map((n, i) => {
    if (
      !n ||
      typeof n !== 'object' ||
      Array.isArray(n) ||
      !Object.keys(n).every((k) => ['id', 'time', 'lane', 'end'].includes(k)) ||
      n.id !== i ||
      !Number.isSafeInteger(n.lane) ||
      n.lane < 0 ||
      n.lane >= lanes ||
      !Number.isFinite(n.time) ||
      n.time < 0 ||
      n.time >= duration ||
      (Object.hasOwn(n, 'end') &&
        (!Number.isFinite(n.end) || n.end <= n.time || n.end > duration))
    )
      throw Error('opus468_note');
    return {
      id: n.id,
      time: n.time,
      lane: n.lane,
      ...(Object.hasOwn(n, 'end') ? { end: n.end } : {}),
    };
  });
  const until = new Map();
  let previous = -Infinity;
  for (const n of out) {
    if (n.time < previous || (until.get(n.lane) ?? -Infinity) >= n.time)
      throw Error('opus468_note_order');
    previous = n.time;
    until.set(n.lane, n.end ?? n.time);
  }
  return out;
}

function deepEqualJson(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || !a || !b || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a))
    return a.length === b.length && a.every((x, i) => deepEqualJson(x, b[i]));
  const ka = Object.keys(a);
  return (
    ka.length === Object.keys(b).length &&
    ka.every((k) => Object.hasOwn(b, k) && deepEqualJson(a[k], b[k]))
  );
}

// Verify the frozen base v2 record + descriptor binding the same way the
// producer worker does before generating (fail-closed, typed errors).
export function bindOpus468Base({
  baseRecordRaw,
  baseRecord,
  descriptor: d,
  descriptorSha256,
}) {
  if (
    typeof baseRecordRaw !== 'string' ||
    TE.encode(baseRecordRaw).length > MAX_STORED_BYTES
  )
    throw Error('opus468_base_record_bytes');
  if (
    !baseRecord ||
    typeof baseRecord !== 'object' ||
    Array.isArray(baseRecord)
  )
    throw Error('opus468_base_record');
  // The raw bytes being hashed must BE the parsed base record: a different
  // valid record object alongside foreign raw bytes is not a binding.
  let parsedRaw;
  try {
    parsedRaw = JSON.parse(baseRecordRaw);
  } catch {
    throw Error('opus468_base_record_json');
  }
  if (!deepEqualJson(parsedRaw, baseRecord))
    throw Error('opus468_base_record_raw_binding');
  if (!d || typeof d !== 'object') throw Error('opus468_descriptor');
  if (!HASH(descriptorSha256)) throw Error('opus468_descriptor_sha');
  const r = baseRecord;
  if (
    r.videoId !== d.videoId ||
    r.audioSha256 !== d.pcm16Sha256 ||
    r.audioDescriptorSha256 !== descriptorSha256 ||
    r.encodedAudioSha256 !== d.oggSha256 ||
    r.decoderWasmSha256 !== DECODER ||
    r.pipelineVersion !== PIPELINE ||
    r.frames !== d.frames ||
    r.sampleRate !== 48000 ||
    d.sampleRate !== 48000 ||
    d.channels !== 2 ||
    !Number.isSafeInteger(d.frames) ||
    d.frames < 1
  )
    throw Error('opus468_base_audio_binding');
  return {
    videoId: r.videoId,
    baseSourceRecordSha256: sha(baseRecordRaw),
    baseChartSetSha256: r.chartSetSha256,
    audioSha256: r.audioSha256,
    audioDescriptorSha256: descriptorSha256,
    encodedAudioSha256: r.encodedAudioSha256,
    decoderWasmSha256: DECODER,
    pipelineVersion: PIPELINE,
    frames: d.frames,
    sampleRate: 48000,
    channels: 2,
  };
}

// Assemble the full extension from generated charts (key -> adapted Note[]).
// Applies SC collapse, ratings, hashes, caps and the stored-bytes bound, then
// self-verifies the stored record against independently re-derived roots.
export function assembleOpus468Extension({
  baseRecordRaw,
  baseRecord,
  descriptor: d,
  descriptorSha256,
  generatedCharts,
  generatorVersion = OPUS468_GENERATOR_VERSION,
}) {
  checkOpus468GeneratorVersion(
    generatorVersion,
    baseRecord && baseRecord.analyzerVersion,
  );
  const bound = bindOpus468Base({
    baseRecordRaw,
    baseRecord,
    descriptor: d,
    descriptorSha256,
  });
  if (
    !generatedCharts ||
    typeof generatedCharts !== 'object' ||
    Array.isArray(generatedCharts)
  )
    throw Error('opus468_charts');
  // Strict 12-slot contract: unknown generated slots are rejected, never
  // silently dropped; partial completion is not allowed.
  for (const k of Object.keys(generatedCharts))
    if (!OPUS468_CHART_KEYS.includes(k))
      throw Error('opus468_unknown_slot_' + k);
  const duration = d.frames / 48000;
  const charts = {};
  const chartMeta = {};
  let total = 0;
  for (const key of OPUS468_CHART_KEYS) {
    const lanes = Number(key[0]);
    const tier = key.slice(2);
    const raw = generatedCharts[key];
    if (!Array.isArray(raw)) throw Error('opus468_missing_slot_' + key);
    const notes = normalizeNotes468(raw, lanes, duration, tier);
    total += notes.length;
    charts[key] = { notes, sha256: sha(JSON.stringify(notes)) };
    chartMeta[key] = {
      family: TIER_FAMILY[tier],
      rating: {
        scale: tier === 'sc' ? 'sc' : 'standard',
        level: rateDifficulty(
          notes,
          duration,
          tier === 'sc' ? 'sc' : 'standard',
        ),
      },
      scAvailable: true,
    };
  }
  if (total > OPUS468_MAX_TOTAL_NOTES) throw Error('opus468_note_count_total');
  // SC collapse: byte-equal SC and MX notes are not playable as SC; the slot is
  // occupied by the explicit marker and unrated metadata.
  for (const lanes of [4, 6, 8]) {
    const scKey = `${lanes}:sc`;
    const highKey = `${lanes}:high`;
    if (
      JSON.stringify(charts[scKey].notes) ===
      JSON.stringify(charts[highKey].notes)
    ) {
      total -= charts[scKey].notes.length;
      charts[scKey] = { unavailable: OPUS468_SC_MARKER };
      chartMeta[scKey] = { family: 'SC', rating: null, scAvailable: false };
    }
  }
  const canonical = {
    kind: OPUS468_EXTENSION_KIND,
    version: 1,
    family: OPUS468_EXTENSION_FAMILY,
    ...bound,
    generatorVersion,
    config: baseRecord.config,
    charts,
    chartMeta,
  };
  const extensionSha256 = sha(JSON.stringify(canonical));
  const stored = { ...canonical, extensionSha256 };
  if (TE.encode(JSON.stringify(stored)).length > MAX_STORED_BYTES)
    throw Error('opus468_stored_bytes');
  selfVerifyOpus468Extension(stored, {
    baseRecordRaw,
    baseRecord,
    descriptor: d,
    descriptorSha256,
  });
  return stored;
}

// Independent re-derivation self-check of a stored extension record: re-binds
// the roots from the raw inputs and re-validates every slot, hash and cap.
// Mirrors the non-journal checks of the binding validator; journal authority is
// out of scope here by design.
export function selfVerifyOpus468Extension(
  stored,
  { baseRecordRaw, baseRecord, descriptor: d, descriptorSha256 },
) {
  const bound = bindOpus468Base({
    baseRecordRaw,
    baseRecord,
    descriptor: d,
    descriptorSha256,
  });
  if (!stored || typeof stored !== 'object' || Array.isArray(stored))
    throw Error('opus468_verify_shape');
  const expectedKeys = [
    'kind',
    'version',
    'family',
    ...ROOTS,
    'generatorVersion',
    'config',
    'charts',
    'chartMeta',
    'extensionSha256',
  ];
  if (!Object.keys(stored).every((k, i) => k === expectedKeys[i]))
    throw Error('opus468_verify_field_order');
  if (
    stored.kind !== OPUS468_EXTENSION_KIND ||
    stored.version !== 1 ||
    stored.family !== OPUS468_EXTENSION_FAMILY
  )
    throw Error('opus468_verify_shape');
  for (const k of ROOTS)
    if (stored[k] !== bound[k]) throw Error('opus468_verify_root_' + k);
  checkOpus468GeneratorVersion(
    stored.generatorVersion,
    baseRecord && baseRecord.analyzerVersion,
  );
  if (stored.config !== baseRecord.config) throw Error('opus468_verify_config');
  const duration = d.frames / 48000;
  let total = 0;
  if (
    !stored.charts ||
    !stored.chartMeta ||
    Object.keys(stored.charts).length !== OPUS468_CHART_KEYS.length ||
    Object.keys(stored.chartMeta).length !== OPUS468_CHART_KEYS.length ||
    !OPUS468_CHART_KEYS.every((k) => Object.hasOwn(stored.charts, k)) ||
    !OPUS468_CHART_KEYS.every((k) => Object.hasOwn(stored.chartMeta, k))
  )
    throw Error('opus468_verify_slots');
  for (const key of OPUS468_CHART_KEYS) {
    const c = stored.charts[key];
    const m = stored.chartMeta[key];
    const tier = key.slice(2);
    const cKeys = Object.keys(c);
    if (cKeys.length === 1 && cKeys[0] === 'unavailable') {
      if (tier !== 'sc' || c.unavailable !== OPUS468_SC_MARKER)
        throw Error('opus468_verify_unavailable');
      if (
        m.family !== 'SC' ||
        m.rating !== null ||
        m.scAvailable !== false ||
        Object.keys(m).length !== 3
      )
        throw Error('opus468_verify_metadata');
      continue;
    }
    if (
      cKeys.length !== 2 ||
      !cKeys.includes('notes') ||
      !cKeys.includes('sha256')
    )
      throw Error('opus468_verify_chart_shape');
    const notes = normalizeNotes468(c.notes, Number(key[0]), duration, tier);
    if (sha(JSON.stringify(notes)) !== c.sha256)
      throw Error('opus468_verify_chart_hash');
    total += notes.length;
    if (
      m.family !== TIER_FAMILY[tier] ||
      m.scAvailable !== true ||
      !m.rating ||
      Object.keys(m.rating).length !== 2 ||
      m.rating.scale !== (tier === 'sc' ? 'sc' : 'standard') ||
      !Number.isInteger(m.rating.level) ||
      m.rating.level < 1 ||
      m.rating.level > 15 ||
      Object.keys(m).length !== 3
    )
      throw Error('opus468_verify_metadata');
    // Rating is derived, not merely bounded: recompute from the notes.
    if (
      m.rating.level !==
      rateDifficulty(notes, duration, tier === 'sc' ? 'sc' : 'standard')
    )
      throw Error('opus468_verify_rating');
  }
  if (total > OPUS468_MAX_TOTAL_NOTES) throw Error('opus468_verify_total');
  for (const lanes of [4, 6, 8]) {
    const sc = stored.charts[`${lanes}:sc`];
    if (
      sc.notes &&
      JSON.stringify(sc.notes) ===
        JSON.stringify(stored.charts[`${lanes}:high`].notes)
    )
      throw Error('opus468_verify_sc_duplicate');
  }
  const { extensionSha256, ...rest } = stored;
  if (sha(JSON.stringify(rest)) !== extensionSha256)
    throw Error('opus468_verify_extension_hash');
  if (TE.encode(JSON.stringify(stored)).length > MAX_STORED_BYTES)
    throw Error('opus468_verify_bytes');
  return true;
}
