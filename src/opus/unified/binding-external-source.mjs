// orvio-share v5 external source validation. Faithful JS port of the frontend's
// external-source.ts (validSourceRecord, presentChartKeys, chartSetHash,
// verifyChartHashes) and external-catalog.ts (sourceAudioId, sourceId).
// Same algorithms, same constants, no runtime deps.
// chart-difficulty.ts (validDifficultyMetadata, familyForKey) is ported VERBATIM
// below from the frontend source transferred 2026-11-08.

export const AUDIO_MAX_SECONDS = 300; // frontend audio-limits.mjs (matches worker audio cap)

const HASH_RE = /^[a-f0-9]{64}$/;
const BASE_CHART_KEYS = [
  '5:low',
  '5:mid',
  '5:high',
  '7:low',
  '7:mid',
  '7:high',
];

export function presentChartKeys(record) {
  return [
    ...BASE_CHART_KEYS,
    ...['5:sc', '7:sc'].filter((key) => record.charts[key] !== undefined),
  ];
}

const CHART_FAMILIES = ['NM', 'HD', 'MX', 'SC'];

/** Family is metadata only; it never renames or replaces a key. */
function familyForKey(key) {
  const tier = key.slice(2);
  return tier === 'low'
    ? 'NM'
    : tier === 'mid'
      ? 'HD'
      : tier === 'high'
        ? 'MX'
        : 'SC';
}

function validDifficultyMetadata(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const m = raw;
  if (
    m.version !== 1 ||
    (m.family !== null && !CHART_FAMILIES.includes(m.family))
  )
    return false;
  if (m.status === 'unrated') return m.rating === null;
  if (m.status !== 'rated' || m.family === null || !m.rating) return false;
  return (
    Number.isInteger(m.rating.level) &&
    m.rating.level >= 1 &&
    m.rating.level <= 15 &&
    m.rating.scale === (m.family === 'SC' ? 'sc' : 'standard')
  );
}

/** Validate every source-bound chart before writing any part of its six-mode pin. */
export function validSourceRecord(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw;
  if (
    r.version !== 1 ||
    !Number.isFinite(r.estimatedBpm) ||
    r.estimatedBpm < 0 ||
    r.estimatedBpm > 400 ||
    !/^[A-Za-z0-9_-]{11}$/.test(r.videoId) ||
    !HASH_RE.test(r.audioSha256) ||
    !Number.isInteger(r.frames) ||
    r.frames <= 0 ||
    !Number.isInteger(r.sampleRate) ||
    r.sampleRate < 8000 ||
    r.sampleRate > 192000 ||
    r.frames / r.sampleRate > AUDIO_MAX_SECONDS ||
    typeof r.pipelineVersion !== 'string' ||
    !r.pipelineVersion ||
    r.pipelineVersion.length > 128 ||
    typeof r.analyzerVersion !== 'string' ||
    !r.analyzerVersion ||
    r.analyzerVersion.length > 128 ||
    typeof r.config !== 'string' ||
    r.config.length > 4096 ||
    (r.chartSetSha256 !== undefined && !HASH_RE.test(r.chartSetSha256)) ||
    !r.charts
  )
    return false;
  for (const key of presentChartKeys(r)) {
    const c = r.charts[key];
    const lanes = Number(key[0]);
    if (
      !c ||
      !HASH_RE.test(c.sha256) ||
      !Array.isArray(c.notes) ||
      c.notes.length === 0 ||
      c.notes.length > 10000
    )
      return false;
    if (
      r.chartMetadata &&
      (!validDifficultyMetadata(r.chartMetadata[key]) ||
        r.chartMetadata[key].family !== familyForKey(key))
    )
      return false;
    const ids = new Set();
    let previous = -Infinity;
    for (const n of c.notes) {
      if (
        !n ||
        !Number.isInteger(n.id) ||
        ids.has(n.id) ||
        !Number.isInteger(n.lane) ||
        n.lane < 0 ||
        n.lane >= lanes ||
        !Number.isFinite(n.time) ||
        n.time < 0 ||
        n.time < previous ||
        n.time >= r.frames / r.sampleRate ||
        (n.end !== undefined &&
          (!Number.isFinite(n.end) ||
            n.end <= n.time ||
            n.end > r.frames / r.sampleRate))
      )
        return false;
      ids.add(n.id);
      previous = n.time;
    }
  }
  return true;
}

const hex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Versioned chart identity does not change the source audio identity. */
export async function chartSetHash(record) {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      analyzer: record.analyzerVersion,
      config: record.config,
      charts: presentChartKeys(record).map((key) => [
        key,
        record.charts[key].sha256,
      ]),
      ...(record.chartMetadata ? { chartMetadata: record.chartMetadata } : {}),
    }),
  );
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}

export async function verifyChartHashes(record) {
  if (!validSourceRecord(record)) return false;
  if (
    record.chartSetSha256 !== undefined &&
    record.chartSetSha256 !== (await chartSetHash(record))
  )
    return false;
  for (const key of presentChartKeys(record)) {
    const bytes = new TextEncoder().encode(
      JSON.stringify(record.charts[key].notes),
    );
    const actual = hex(await crypto.subtle.digest('SHA-256', bytes));
    if (actual !== record.charts[key].sha256) return false;
  }
  return true;
}

export function sourceAudioId(r) {
  return `yt-${r.videoId}-${r.audioSha256.slice(0, 16)}`;
}
export function sourceId(r) {
  return `${sourceAudioId(r)}${r.chartSetSha256 ? `-c${r.chartSetSha256.slice(0, 16)}` : ''}`;
}

// Explicit v2 Opus replay branch; legacy validator and digest serialization stay unchanged.
export function validOpusSourceRecord(r) {
  if (
    !r ||
    typeof r !== 'object' ||
    Array.isArray(r) ||
    r.version !== 2 ||
    r.audioFormat !== 'orvio-opus-v1' ||
    r.pipelineVersion !== 'orvio-opus-pinned-pcm16-48k-v1' ||
    r.sourceProvenance !== 'local-opus35-v1' ||
    r.sampleRate !== 48000 ||
    r.decoderWasmSha256 !==
      '8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b' ||
    ![
      r.audioDescriptorSha256,
      r.encodedAudioSha256,
      r.audioSha256,
      r.chartSetSha256,
    ].every((v) => typeof v === 'string' && HASH_RE.test(v)) ||
    r.manifestSha256 !== undefined
  )
    return false;
  return validSourceRecord({ ...r, version: 1 });
}
export async function verifyOpusChartHashes(r) {
  return validOpusSourceRecord(r) && verifyChartHashes({ ...r, version: 1 });
}
export function opusSourceId(r) {
  return `yt-opus-${r.videoId}-${r.audioSha256}-c${r.chartSetSha256}`;
}
