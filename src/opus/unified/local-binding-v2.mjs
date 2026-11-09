// NEW split local validator. Accepted94 local structure/canonical/cap logic
// copied unchanged; journal/effect authority checks explicitly excluded, never
// replaced with a fabricated journal. Requires independent split-contract review.
// PRIVATE pure binding preparation. No runtime import, IO, admission or publication.
// journal must come directly from the owning DO, never from a client envelope.
// A self-hashed frozen chart is not an authenticated analyzer result.
import { descriptorBytes, hash, DECODER } from './binding-opus-descriptor.mjs';
import { verifyOpusChartHashes } from './binding-external-source.mjs';
const TE = new TextEncoder(),
  PIPELINE = 'orvio-opus-pinned-pcm16-48k-v1';
export const OPUS_EXTENSION_KIND = 'orvio-opus-chart-extension-v1';
export const OPUS_EXTENSION_FAMILY = '468-v1';
export const OPUS_EXTENSION_KEYS = Object.freeze(
  [4, 6, 8].flatMap((n) =>
    ['low', 'mid', 'high', 'sc'].map((t) => `${n}:${t}`),
  ),
);
const BASE_KEYS = ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'],
  SC_KEYS = ['5:sc', '7:sc'];
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
const FIELDS = [
  'kind',
  'version',
  'family',
  ...ROOTS,
  'generatorVersion',
  'config',
  'charts',
  'chartMeta',
];
const HASH = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const obj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const shape = (o, required, optional = []) =>
  obj(o) &&
  required.every((k) => Object.hasOwn(o, k)) &&
  Object.keys(o).every((k) => required.includes(k) || optional.includes(k));
const fail = (e) => {
  throw Error(e);
};
const sha = (s) => hash(TE.encode(s));
const tierFamily = { low: 'NM', mid: 'HD', high: 'MX', sc: 'SC' },
  caps = { low: 910, mid: 1270, high: 2770, sc: 3130 };
function note(n, lanes, duration) {
  if (
    !shape(n, ['id', 'time', 'lane'], ['end']) ||
    !Number.isSafeInteger(n.id) ||
    n.id < 0 ||
    !Number.isSafeInteger(n.lane) ||
    n.lane < 0 ||
    n.lane >= lanes ||
    !Number.isFinite(n.time) ||
    n.time < 0 ||
    n.time >= duration ||
    (Object.hasOwn(n, 'end') &&
      (!Number.isFinite(n.end) || n.end <= n.time || n.end > duration))
  )
    fail('extension_note');
  return {
    id: n.id,
    time: n.time,
    lane: n.lane,
    ...(Object.hasOwn(n, 'end') ? { end: n.end } : {}),
  };
}
function notes(
  raw,
  lanes,
  duration,
  { sequential = false, limit = 10000 } = {},
) {
  if (!Array.isArray(raw) || !raw.length || raw.length > limit)
    fail('extension_note_count');
  const out = raw.map((n) => note(n, lanes, duration)),
    ids = new Set(),
    until = new Map();
  let previous = -Infinity;
  for (let i = 0; i < out.length; i++) {
    const n = out[i];
    if (
      ids.has(n.id) ||
      (sequential && n.id !== i) ||
      n.time < previous ||
      (until.get(n.lane) ?? -Infinity) >= n.time
    )
      fail('extension_note_order');
    ids.add(n.id);
    previous = n.time;
    until.set(n.lane, n.end ?? n.time);
  }
  return out;
}
function metadata(m, tier, available) {
  if (
    !shape(m, ['family', 'rating', 'scAvailable']) ||
    m.family !== tierFamily[tier] ||
    m.scAvailable !== available
  )
    fail('extension_metadata');
  if (!available) {
    if (m.rating !== null) fail('extension_metadata');
    return { family: m.family, rating: null, scAvailable: false };
  }
  if (
    !shape(m.rating, ['scale', 'level']) ||
    m.rating.scale !== (tier === 'sc' ? 'sc' : 'standard') ||
    !Number.isInteger(m.rating.level) ||
    m.rating.level < 1 ||
    m.rating.level > 15
  )
    fail('extension_metadata');
  return {
    family: m.family,
    rating: { scale: m.rating.scale, level: m.rating.level },
    scAvailable: true,
  };
}
async function baseRecord(raw) {
  if (typeof raw !== 'string' || TE.encode(raw).length > 1572864)
    fail('base_record_bytes');
  let r;
  try {
    r = JSON.parse(raw);
  } catch {
    fail('base_record_json');
  }
  if (
    !shape(
      r,
      [
        'version',
        'videoId',
        'audioSha256',
        'sampleRate',
        'estimatedBpm',
        'frames',
        'pipelineVersion',
        'analyzerVersion',
        'config',
        'chartSetSha256',
        'charts',
        'audioFormat',
        'audioDescriptorSha256',
        'encodedAudioSha256',
        'decoderWasmSha256',
        'sourceProvenance',
      ],
      ['chartMetadata'],
    )
  )
    fail('base_record_shape');
  if (!shape(r.charts, BASE_KEYS, SC_KEYS)) fail('base_chart_shape');
  const keys = [
    ...BASE_KEYS,
    ...SC_KEYS.filter((k) => Object.hasOwn(r.charts, k)),
  ];
  for (const key of keys) {
    const c = r.charts[key];
    if (!shape(c, ['notes', 'sha256']) || !HASH(c.sha256))
      fail('base_chart_shape');
    notes(c.notes, Number(key[0]), r.frames / r.sampleRate);
  }
  if (r.chartMetadata !== undefined) {
    if (!shape(r.chartMetadata, keys)) fail('base_metadata');
    for (const key of keys) {
      const m = r.chartMetadata[key];
      if (
        !shape(m, ['version', 'family', 'status', 'rating']) ||
        m.version !== 1 ||
        m.family !== tierFamily[key.slice(2)] ||
        !['rated', 'unrated'].includes(m.status)
      )
        fail('base_metadata');
      if (m.status === 'unrated') {
        if (m.rating !== null) fail('base_metadata');
      } else if (!shape(m.rating, ['scale', 'level'])) fail('base_metadata');
    }
  }
  if (!(await verifyOpusChartHashes(r))) fail('base_record_invalid');
  return r;
}
/** Validate a complete 12-slot extension. No qualified generator exists by default.
 * qualifiedGeneratorVersions is supplied by trusted integration code only after
 * producer qualification. It is not a client field or an authority granted here.
 * SC collapse markers occupy their required slot and are not playable charts.
 */
export async function validateOpusExtensionLocalBinding({
  extension: e,
  baseSourceRecordJson,
  descriptor: d,
  qualifiedGeneratorVersions = [],
} = {}) {
  try {
    if (
      !shape(e, [...FIELDS, 'extensionSha256']) ||
      e.kind !== OPUS_EXTENSION_KIND ||
      e.version !== 1 ||
      e.family !== OPUS_EXTENSION_FAMILY
    )
      fail('extension_shape');
    if (
      !Array.isArray(qualifiedGeneratorVersions) ||
      !qualifiedGeneratorVersions.every((v) => typeof v === 'string') ||
      typeof e.generatorVersion !== 'string' ||
      !e.generatorVersion ||
      e.generatorVersion.length > 128 ||
      !qualifiedGeneratorVersions.includes(e.generatorVersion) ||
      e.generatorVersion.startsWith('research-c3') ||
      e.generatorVersion === 'orvio-current35-v1'
    )
      fail('unqualified_generator');
    const r = await baseRecord(baseSourceRecordJson),
      rawBaseSha = sha(baseSourceRecordJson),
      db = descriptorBytes(d),
      dh = hash(db);
    if (e.generatorVersion === r.analyzerVersion)
      fail('base_analyzer_is_not_extension_generator');
    // NO journal synthesis. Owner COMMITTED/effects/footprint are a separate
    // genuine backend nonce-currentness contract, not proved by this validator.
    if (
      r.videoId !== d.videoId ||
      r.audioSha256 !== d.pcm16Sha256 ||
      r.audioDescriptorSha256 !== dh ||
      r.encodedAudioSha256 !== d.oggSha256 ||
      r.decoderWasmSha256 !== DECODER ||
      r.pipelineVersion !== PIPELINE ||
      r.frames !== d.frames ||
      r.sampleRate !== d.sampleRate ||
      d.channels !== 2
    )
      fail('base_audio_binding');
    const bound = {
      videoId: r.videoId,
      baseSourceRecordSha256: rawBaseSha,
      baseChartSetSha256: r.chartSetSha256,
      audioSha256: r.audioSha256,
      audioDescriptorSha256: dh,
      encodedAudioSha256: r.encodedAudioSha256,
      decoderWasmSha256: DECODER,
      pipelineVersion: PIPELINE,
      frames: d.frames,
      sampleRate: 48000,
      channels: 2,
    };
    if (
      ROOTS.some((k) => e[k] !== bound[k]) ||
      ROOTS.filter((k) => k.endsWith('Sha256')).some((k) => !HASH(e[k])) ||
      typeof e.config !== 'string' ||
      e.config !== r.config
    )
      fail('extension_base_binding');
    if (
      !shape(e.charts, OPUS_EXTENSION_KEYS) ||
      !shape(e.chartMeta, OPUS_EXTENSION_KEYS)
    )
      fail('extension_slots');
    let total = 0;
    const charts = {},
      chartMeta = {};
    for (const key of OPUS_EXTENSION_KEYS) {
      const c = e.charts[key],
        tier = key.slice(2);
      if (shape(c, ['unavailable'])) {
        if (tier !== 'sc' || c.unavailable !== 'sc_collapsed_into_mx')
          fail('extension_unavailable');
        charts[key] = { unavailable: 'sc_collapsed_into_mx' };
        chartMeta[key] = metadata(e.chartMeta[key], tier, false);
        continue;
      }
      if (!shape(c, ['notes', 'sha256']) || !HASH(c.sha256))
        fail('extension_chart_shape');
      const nn = notes(c.notes, Number(key[0]), d.frames / 48000, {
        sequential: true,
        limit: caps[tier],
      });
      if (sha(JSON.stringify(nn)) !== c.sha256) fail('extension_chart_hash');
      total += nn.length;
      charts[key] = { notes: nn, sha256: c.sha256 };
      chartMeta[key] = metadata(e.chartMeta[key], tier, true);
    }
    if (total > 24300) fail('extension_note_count');
    for (const mode of [4, 6, 8])
      if (
        charts[`${mode}:sc`].notes &&
        JSON.stringify(charts[`${mode}:sc`].notes) ===
          JSON.stringify(charts[`${mode}:high`].notes)
      )
        fail('extension_sc_duplicate');
    const canonical = {
      kind: OPUS_EXTENSION_KIND,
      version: 1,
      family: OPUS_EXTENSION_FAMILY,
      ...bound,
      generatorVersion: e.generatorVersion,
      config: e.config,
      charts,
      chartMeta,
    };
    const extensionSha256 = sha(JSON.stringify(canonical));
    if (!HASH(e.extensionSha256) || e.extensionSha256 !== extensionSha256)
      fail('extension_hash');
    const storedBytes = TE.encode(
      JSON.stringify({ ...canonical, extensionSha256 }),
    );
    if (storedBytes.length > 1572864) fail('extension_bytes');
    return {
      ok: true,
      canonical,
      extensionSha256,
      storedBytes,
      storedBytesSha256: hash(storedBytes),
      playableKeys: OPUS_EXTENSION_KEYS.filter((k) => !!charts[k].notes),
    };
  } catch (error) {
    return { ok: false, error: error?.message || 'extension_invalid' };
  }
}
