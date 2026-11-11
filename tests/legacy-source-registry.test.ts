import { it, expect } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import FIXED from '../reference/public-manifest0914.json';
import {
  LEGACY_SOURCE_REGISTRY,
  LEGACY_SOURCE_ROOT_KEYS,
  findLegacySourceRoots,
  resolveVerifiedLegacySource,
} from '../src/opus/unified/legacy-source-registry.mjs';

const frostDescriptorBytes = fs.readFileSync(
  new URL('../test-support/opus35-frost/descriptor.json', import.meta.url),
);
const frostDescriptor = JSON.parse(frostDescriptorBytes.toString('utf8'));
const frostRecord = JSON.parse(
  fs.readFileSync(
    new URL('../test-support/opus35-frost/record.json', import.meta.url),
    'utf8',
  ),
);
const legacyDescriptorBytes = fs.readFileSync(
  new URL('../test-support/legacy3Ihr/descriptor.json', import.meta.url),
);
const sha = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

const registryRoots = (entry: any) =>
  Object.fromEntries(LEGACY_SOURCE_ROOT_KEYS.map((k: any) => [k, entry[k]]));

it('registry is the exact reviewed manifest full tuple, not a caller projection', () => {
  expect(LEGACY_SOURCE_REGISTRY).toHaveLength(19);
  const [entry] = LEGACY_SOURCE_REGISTRY;
  expect(entry).toMatchObject({
    kind: 'orvio-fixed-legacy-sidecar-source-v1',
    manifestId: FIXED.id,
    videoId: FIXED.videoId,
    encodedAudioSha256: FIXED.encodedAudioSha256,
    audioDescriptorSha256: FIXED.descriptorSha256,
    audioSha256: FIXED.pcm16Sha256,
    decoderWasmSha256: FIXED.decoderWasmSha256,
    frames: FIXED.frames,
    sampleRate: 48000,
    channels: 2,
  });
  expect(findLegacySourceRoots(registryRoots(entry))).toBe(entry);
});

it('every single full-root mutation rejects the registry match', () => {
  const [entry] = LEGACY_SOURCE_REGISTRY;
  for (const key of LEGACY_SOURCE_ROOT_KEYS) {
    const roots = registryRoots(entry);
    if (key === 'videoId') roots[key] = 'AAAAAAAAAAA';
    else if (key === 'frames') roots[key] = entry.frames + 1;
    else if (key === 'sampleRate') roots[key] = 44100;
    else if (key === 'channels') roots[key] = 1;
    else roots[key] = 'f'.repeat(64);
    expect(findLegacySourceRoots(roots), key).toBeNull();
  }
});

it('caller flags/extra keys, missing keys, arrays and null are not authority', () => {
  const [entry] = LEGACY_SOURCE_REGISTRY;
  const roots = registryRoots(entry);
  for (const extra of [
    { sourceKind: 'published-legacy-sidecar' },
    { manifestURL: 'https://example.invalid/manifest' },
    { manifestId: entry.manifestId },
    { verified: true },
    { dbFlag: 'legacy' },
    { transport: 'published-legacy-sidecar' },
  ])
    expect(findLegacySourceRoots({ ...roots, ...extra })).toBeNull();
  const missing = { ...roots };
  delete missing.decoderWasmSha256;
  expect(findLegacySourceRoots(missing)).toBeNull();
  expect(findLegacySourceRoots([...LEGACY_SOURCE_ROOT_KEYS])).toBeNull();
  expect(findLegacySourceRoots(null)).toBeNull();
});

it('a valid descriptor and verified base record that is not registered is denied', async () => {
  expect(sha(frostDescriptorBytes)).toBe(frostRecord.audioDescriptorSha256);
  expect(
    await resolveVerifiedLegacySource({
      descriptorBytes: frostDescriptorBytes,
      baseRecord: frostRecord,
    }),
  ).toBeNull();
  expect(
    await resolveVerifiedLegacySource({
      descriptorBytes: frostDescriptorBytes,
      baseRecord: frostRecord,
      sourceKind: 'published-legacy-sidecar',
      manifestId: FIXED.id,
      verified: true,
    } as any),
  ).toBeNull();
});

it('registry roots on an unverified base record never match', async () => {
  expect(
    await resolveVerifiedLegacySource({
      descriptorBytes: legacyDescriptorBytes,
      baseRecord: {},
    }),
  ).toBeNull();
});

it('a descriptor root mutation fails record binding even with a valid record', async () => {
  const changed = {
    ...frostDescriptor,
    pcm16Sha256: 'f'.repeat(64),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(changed));
  expect(
    await resolveVerifiedLegacySource({
      descriptorBytes: bytes,
      baseRecord: frostRecord,
    }),
  ).toBeNull();
});

it('descriptor and base record are snapshotted before the first await', async () => {
  const bytes = new Uint8Array(frostDescriptorBytes);
  const record = structuredClone(frostRecord);
  const pending = resolveVerifiedLegacySource({
    descriptorBytes: bytes,
    baseRecord: record,
  });
  bytes.fill(0);
  record.videoId = 'AAAAAAAAAAA';
  await expect(pending).resolves.toBeNull();
});
