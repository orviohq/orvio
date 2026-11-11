import { LEGACY_INVENTORY_ENTRIES } from '../legacy-source-inventory.mjs';
import { parseVerifiedDescriptor, sha256 } from '../opus-descriptor.mjs';
import { verifyOpusRecord } from '../opus-record.ts';

export const LEGACY_SOURCE_REGISTRY_KIND =
  'orvio-fixed-legacy-sidecar-source-v1';
export const LEGACY_SOURCE_ROOT_KEYS = Object.freeze([
  'videoId',
  'encodedAudioSha256',
  'audioDescriptorSha256',
  'audioSha256',
  'decoderWasmSha256',
  'frames',
  'sampleRate',
  'channels',
]);

const plain = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const exact = (o, keys) =>
  plain(o) &&
  Object.keys(o).length === keys.length &&
  keys.every((k) => Object.hasOwn(o, k));
const fail = (code) => {
  throw Error('legacy_source_registry_' + code);
};
function buildEntry(source) {
  if (
    !plain(source) ||
    typeof source.manifestId !== 'string' ||
    typeof source.videoId !== 'string' ||
    source.sampleRate !== 48000 ||
    source.channels !== 2
  )
    fail('manifest');
  return Object.freeze({
    kind: LEGACY_SOURCE_REGISTRY_KIND,
    manifestId: source.manifestId,
    videoId: source.videoId,
    encodedAudioSha256: source.encodedAudioSha256,
    audioDescriptorSha256: source.audioDescriptorSha256,
    audioSha256: source.audioSha256,
    decoderWasmSha256: source.decoderWasmSha256,
    frames: source.frames,
    sampleRate: 48000,
    channels: 2,
  });
}
export const LEGACY_SOURCE_REGISTRY = Object.freeze(
  LEGACY_INVENTORY_ENTRIES.map(buildEntry),
);
export function findLegacySourceRoots(roots) {
  if (!exact(roots, LEGACY_SOURCE_ROOT_KEYS)) return null;
  const matches = LEGACY_SOURCE_REGISTRY.filter((entry) =>
    LEGACY_SOURCE_ROOT_KEYS.every((key) => entry[key] === roots[key]),
  );
  return matches.length === 1 ? matches[0] : null;
}
export async function resolveVerifiedLegacySource({
  descriptorBytes,
  baseRecord,
  signal,
} = {}) {
  signal?.throwIfAborted();
  if (!(descriptorBytes instanceof Uint8Array)) fail('descriptor');
  if (!plain(baseRecord)) fail('base_record');
  const bytes = descriptorBytes.slice(),
    record = structuredClone(baseRecord);
  const descriptorSha256 = await sha256(bytes);
  const descriptor = await parseVerifiedDescriptor(bytes, descriptorSha256);
  signal?.throwIfAborted();
  if (!(await verifyOpusRecord(record, descriptor, descriptorSha256)))
    return null;
  signal?.throwIfAborted();
  return findLegacySourceRoots({
    videoId: descriptor.videoId,
    encodedAudioSha256: descriptor.oggSha256,
    audioDescriptorSha256: descriptorSha256,
    audioSha256: descriptor.pcm16Sha256,
    decoderWasmSha256: descriptor.decoderWasmSha256,
    frames: descriptor.frames,
    sampleRate: descriptor.sampleRate,
    channels: descriptor.channels,
  });
}
