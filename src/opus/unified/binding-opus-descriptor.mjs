import { sha256 } from '@noble/hashes/sha2.js';
export const FORMAT = 'orvio-opus-v1',
  ENCODER = '4b0b17e171bb7469e1e32e7d3bb85ca59b4b89d0b2cd1a7a5d90e4c03ae04c09',
  DECODER = '8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b',
  PCM_RULE =
    's16le scale=32768 half-to-even-ties saturate-after-quantize reject-nonfinite';
const H = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x),
  V = (x) => typeof x === 'string' && /^[A-Za-z0-9_-]{11}$/.test(x),
  N = (x, min, max) => Number.isSafeInteger(x) && x >= min && x <= max;
export const hash = (b) =>
  Array.from(sha256(b), (x) => x.toString(16).padStart(2, '0')).join('');
const exact = (o, keys) =>
  o &&
  typeof o === 'object' &&
  !Array.isArray(o) &&
  Object.keys(o).length === keys.length &&
  keys.every((k) => Object.hasOwn(o, k));
const fields = [
  'schemaVersion',
  'audioFormat',
  'videoId',
  'oggSha256',
  'oggBytes',
  'pcm16Sha256',
  'sampleRate',
  'channels',
  'frames',
  'preSkip',
  'bitrateTargetKbps',
  'encoderWasmSha256',
  'decoderWasmSha256',
  'pcm16Rule',
  'source',
  'parts',
];
export function validateOpusDescriptor(d, videoId, oggSha) {
  if (
    !exact(d, fields) ||
    d.schemaVersion !== 1 ||
    d.audioFormat !== FORMAT ||
    !V(d.videoId) ||
    (videoId !== undefined && d.videoId !== videoId) ||
    !H(d.oggSha256) ||
    (oggSha !== undefined && d.oggSha256 !== oggSha) ||
    !H(d.pcm16Sha256) ||
    !N(d.oggBytes, 1, 6000000) ||
    d.sampleRate !== 48000 ||
    d.channels !== 2 ||
    !N(d.frames, 1, 14400000) ||
    !N(d.preSkip, 0, 65535) ||
    ![96, 80, 64].includes(d.bitrateTargetKbps) ||
    d.encoderWasmSha256 !== ENCODER ||
    d.decoderWasmSha256 !== DECODER ||
    d.pcm16Rule !== PCM_RULE
  )
    throw Error('invalid_opus_descriptor');
  const s = d.source;
  if (
    !exact(s, ['sha256', 'bytes', 'sampleRate', 'channels', 'frames']) ||
    !H(s.sha256) ||
    !N(s.bytes, 44, 57800000) ||
    ![44100, 48000].includes(s.sampleRate) ||
    s.channels !== 2 ||
    !N(s.frames, 1, s.sampleRate * 300) ||
    s.bytes < s.frames * 4 + 44
  )
    throw Error('invalid_opus_source');
  // The resampler's exact output frame count is authoritative; reject >1-frame rounding drift.
  if (Math.abs(d.frames - (s.frames * 48000) / s.sampleRate) > 1)
    throw Error('opus_duration_mismatch');
  if (!Array.isArray(d.parts) || !d.parts.length || d.parts.length > 6)
    throw Error('invalid_opus_parts');
  let bytes = 0;
  for (let i = 0; i < d.parts.length; i++) {
    const p = d.parts[i];
    if (
      !exact(p, ['index', 'bytes', 'sha256']) ||
      p.index !== i ||
      !H(p.sha256) ||
      !N(p.bytes, 1, 1048576) ||
      (i < d.parts.length - 1 && p.bytes !== 1048576)
    )
      throw Error('invalid_opus_part');
    bytes += p.bytes;
  }
  if (bytes !== d.oggBytes) throw Error('opus_part_total');
  return d;
}
export function descriptorBytes(d) {
  validateOpusDescriptor(d);
  return new TextEncoder().encode(
    JSON.stringify(Object.fromEntries(fields.map((k) => [k, d[k]]))),
  );
}
export function parseDescriptor(
  bytes,
  { videoId, oggSha256, descriptorSha256 } = {},
) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.length > 16384 ||
    !H(descriptorSha256) ||
    hash(bytes) !== descriptorSha256
  )
    throw Error('descriptor_integrity');
  let d;
  try {
    d = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw Error('descriptor_json');
  }
  return validateOpusDescriptor(d, videoId, oggSha256);
}
