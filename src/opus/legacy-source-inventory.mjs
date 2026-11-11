// BUILD-owned reviewed fixed inventory. No runtime registration or caller authority.
import RAW_ENTRIES from '../../reference/fixed-legacy-inventory1119.json' with { type: 'json' };
import { sha256 } from '@noble/hashes/sha2.js';

const H = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const V = (x) => typeof x === 'string' && /^[A-Za-z0-9_-]{11}$/.test(x);
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fail = (code) => {
  throw Error('legacy_inventory_' + code);
};
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function build(raw) {
  const publicManifest = JSON.parse(raw.publicWire);
  if (
    JSON.stringify(publicManifest) !== raw.publicWire ||
    publicManifest.artifactRole !== 'audio-only' ||
    publicManifest.chartEngineBinding !== null ||
    publicManifest.id !== raw.manifestId ||
    publicManifest.videoId !== raw.videoId ||
    publicManifest.encodedAudioSha256 !== raw.encodedAudioSha256 ||
    publicManifest.descriptorSha256 !== raw.audioDescriptorSha256 ||
    publicManifest.pcm16Sha256 !== raw.audioSha256 ||
    publicManifest.decoderWasmSha256 !== raw.decoderWasmSha256 ||
    publicManifest.frames !== raw.frames ||
    !H(raw.manifestId) ||
    !V(raw.videoId) ||
    !H(raw.encodedAudioSha256) ||
    !H(raw.audioDescriptorSha256) ||
    !H(raw.audioSha256) ||
    !H(raw.decoderWasmSha256) ||
    !Number.isSafeInteger(raw.frames) ||
    raw.frames < 1 ||
    raw.sampleRate !== 48000 ||
    raw.channels !== 2 ||
    raw.bodyBytes !== new TextEncoder().encode(raw.publicWire).length ||
    hex(sha256(new TextEncoder().encode(raw.publicWire))) !== raw.bodySha256
  )
    fail('entry');
  return deepFreeze({
    ordinal: raw.ordinal,
    manifestId: raw.manifestId,
    videoId: raw.videoId,
    encodedAudioSha256: raw.encodedAudioSha256,
    audioDescriptorSha256: raw.audioDescriptorSha256,
    audioSha256: raw.audioSha256,
    decoderWasmSha256: raw.decoderWasmSha256,
    frames: raw.frames,
    sampleRate: 48000,
    channels: 2,
    bodySha256: raw.bodySha256,
    bodyBytes: raw.bodyBytes,
    publicWire: raw.publicWire,
    publicManifest,
  });
}
const entries = [];
for (let i = 0; i < RAW_ENTRIES.length; i++) {
  if (RAW_ENTRIES[i]?.ordinal !== i) fail('ordinal');
  entries.push(build(RAW_ENTRIES[i]));
}
if (entries.length !== 19) fail('count');
const ids = new Set(entries.map((e) => e.manifestId));
const videos = new Set(entries.map((e) => e.videoId));
if (ids.size !== entries.length || videos.size !== entries.length) fail('unique');
const byManifestId = new Map(entries.map((e) => [e.manifestId, e]));
export const DEFAULT_LEGACY_MANIFEST_ID = entries[0].manifestId;
export const LEGACY_INVENTORY_ENTRIES = Object.freeze(entries);
export const FIXED_LEGACY_INVENTORY = deepFreeze({
  version: 1,
  kind: 'orvio-fixed-legacy-inventory-v1',
  count: entries.length,
  manifestIds: entries.map((e) => e.manifestId),
  videoIds: entries.map((e) => e.videoId),
  entries: LEGACY_INVENTORY_ENTRIES,
});
export function recognizedLegacyManifestId(manifestId) {
  return typeof manifestId === 'string' && byManifestId.has(manifestId);
}
export function legacyInventoryEntryByManifestId(manifestId) {
  return recognizedLegacyManifestId(manifestId)
    ? byManifestId.get(manifestId)
    : null;
}
