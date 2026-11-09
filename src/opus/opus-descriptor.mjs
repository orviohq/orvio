import { parseOpus35Canonical } from './opus35-canonical.mjs';
export const FORMAT = 'orvio-opus-v1',
  PIPELINE = 'orvio-opus-pinned-pcm16-48k-v1';
export const ENCODER =
    '4b0b17e171bb7469e1e32e7d3bb85ca59b4b89d0b2cd1a7a5d90e4c03ae04c09',
  DECODER = '8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b';
export const RULE =
  's16le scale=32768 half-to-even-ties saturate-after-quantize reject-nonfinite';
const hash = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x),
  int = (x, a, b) => Number.isSafeInteger(x) && x >= a && x <= b;
const keys = [
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
const exact = (o, k) =>
  o &&
  typeof o === 'object' &&
  !Array.isArray(o) &&
  Object.keys(o).length === k.length &&
  k.every((x) => Object.hasOwn(o, x));
export function validOpusDescriptor(d) {
  if (
    !exact(d, keys) ||
    d.schemaVersion !== 1 ||
    d.audioFormat !== FORMAT ||
    typeof d.videoId !== 'string' ||
    !/^[A-Za-z0-9_-]{11}$/.test(d.videoId) ||
    !hash(d.oggSha256) ||
    !hash(d.pcm16Sha256) ||
    !int(d.oggBytes, 1, 6000000) ||
    d.sampleRate !== 48000 ||
    d.channels !== 2 ||
    !int(d.frames, 1, 14400000) ||
    !int(d.preSkip, 0, 65535) ||
    ![96, 80, 64].includes(d.bitrateTargetKbps) ||
    d.encoderWasmSha256 !== ENCODER ||
    d.decoderWasmSha256 !== DECODER ||
    d.pcm16Rule !== RULE
  )
    return false;
  const s = d.source;
  if (
    !exact(s, ['sha256', 'bytes', 'sampleRate', 'channels', 'frames']) ||
    !hash(s.sha256) ||
    ![44100, 48000].includes(s.sampleRate) ||
    s.channels !== 2 ||
    !int(s.frames, 1, s.sampleRate * 300) ||
    !int(s.bytes, 44, 57800000) ||
    s.bytes < s.frames * 4 + 44 ||
    Math.abs(d.frames - (s.frames * 48000) / s.sampleRate) > 1
  )
    return false;
  if (!Array.isArray(d.parts) || d.parts.length < 1 || d.parts.length > 6)
    return false;
  let sum = 0;
  for (let i = 0; i < d.parts.length; i++) {
    const p = d.parts[i];
    if (
      !exact(p, ['index', 'bytes', 'sha256']) ||
      p.index !== i ||
      !int(p.bytes, 1, 1048576) ||
      (i < d.parts.length - 1 && p.bytes !== 1048576) ||
      !hash(p.sha256)
    )
      return false;
    sum += p.bytes;
  }
  return sum === d.oggBytes;
}
export async function sha256(bytes) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function parseVerifiedDescriptor(bytes, expectedSha) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.length > 32768 ||
    !hash(expectedSha) ||
    (await sha256(bytes)) !== expectedSha
  )
    throw Error('opus_descriptor_identity');
  const d = parseOpus35Canonical(
    new TextDecoder('utf-8', { fatal: true }).decode(bytes),
  );
  if (!validOpusDescriptor(d)) throw Error('opus_descriptor_shape');
  return d;
}
export async function verifyEncodedParts(bytes, d) {
  if (
    !validOpusDescriptor(d) ||
    !(bytes instanceof Uint8Array) ||
    bytes.length !== d.oggBytes ||
    (await sha256(bytes)) !== d.oggSha256
  )
    throw Error('opus_encoded_identity');
  let off = 0;
  for (const p of d.parts) {
    if ((await sha256(bytes.subarray(off, off + p.bytes))) !== p.sha256)
      throw Error('opus_part_identity');
    off += p.bytes;
  }
}
