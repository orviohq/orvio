import { it, expect } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  FIXED_LEGACY_INVENTORY,
  LEGACY_INVENTORY_ENTRIES,
  recognizedLegacyManifestId,
  legacyInventoryEntryByManifestId,
} from '../src/opus/legacy-source-inventory.mjs';
import {
  LEGACY_SOURCE_REGISTRY,
  LEGACY_SOURCE_ROOT_KEYS,
  findLegacySourceRoots,
} from '../src/opus/unified/legacy-source-registry.mjs';
import { parseLegacySidecarManifest } from '../src/opus/opus35-legacy-sidecar.mjs';
import PROVENANCE from '../reference/fixed-legacy-inventory1119-provenance.json';
import RAW from '../reference/fixed-legacy-inventory1119.json';

const sha = (b: string | Uint8Array) => createHash('sha256').update(b).digest('hex');
const text = (b: Uint8Array) => new TextDecoder().decode(b);

it('all 19 public wires match reviewed M derivation, SHA and UTF-8 bytes', () => {
  expect(LEGACY_INVENTORY_ENTRIES).toHaveLength(19);
  expect(FIXED_LEGACY_INVENTORY.count).toBe(19);
  expect(RAW).toHaveLength(19);
  expect(PROVENANCE.entries).toHaveLength(19);
  expect(PROVENANCE.backendNormalRoot.sha256).toBe(
    '6acb5c2ca162903db05c1fbcea682ab03ee288b8fe5bbad530b0cae8b60d45b4',
  );
  for (let i = 0; i < 19; i++) {
    const e = LEGACY_INVENTORY_ENTRIES[i],
      p = PROVENANCE.entries[i];
    expect(e.ordinal).toBe(i);
    expect(e.manifestId).toBe(p.manifestId);
    expect(e.videoId).toBe(p.videoId);
    expect(e.publicWire).toBe(JSON.stringify(JSON.parse(e.publicWire)));
    expect(sha(e.publicWire)).toBe(p.bodySha256);
    expect(sha(e.publicWire)).toBe(e.bodySha256);
    expect(new TextEncoder().encode(e.publicWire).length).toBe(e.bodyBytes);
    expect(e.bodyBytes).toBe(p.bodyBytes);
    const M = JSON.parse(e.publicWire);
    expect(M.artifactRole).toBe('audio-only');
    expect(M.chartEngineBinding).toBe(null);
    delete M.artifactRole;
    delete M.chartEngineBinding;
    delete M.id;
    expect(sha(JSON.stringify(M))).toBe(e.manifestId);
    expect(e.manifestId).toBe(p.manifestId);
    expect(e.encodedAudioSha256).toBe(p.encodedAudioSha256);
    expect(e.audioDescriptorSha256).toBe(p.descriptorSha256);
    expect(e.audioSha256).toBe(p.pcm16Sha256);
    expect(e.decoderWasmSha256).toBe(p.decoderWasmSha256);
    expect(e.frames).toBe(p.frames);
    expect(Object.isFrozen(e)).toBe(true);
    expect(Object.isFrozen(e.publicManifest)).toBe(true);
    expect(Object.isFrozen(e.publicManifest.payloads[0])).toBe(true);
  }
  const first = fs.readFileSync(
    new URL('../reference/public-manifest0914.json', import.meta.url),
    'utf8',
  );
  expect(first).toBe(LEGACY_INVENTORY_ENTRIES[0].publicWire);
  expect(first.length).toBe(1597);
  expect(sha(first)).toBe(
    '072d3c9b7e3f8f2798c5613dc881b24c2b44f2388f885138f6f9e564f342a15c',
  );
});

it('registry maps all 19 exact 8-root tuples and rejects every single-field mutation', () => {
  expect(LEGACY_SOURCE_REGISTRY).toHaveLength(19);
  for (const entry of LEGACY_SOURCE_REGISTRY) {
    const roots = Object.fromEntries(
      LEGACY_SOURCE_ROOT_KEYS.map((k: string) => [k, (entry as any)[k]]),
    );
    expect(findLegacySourceRoots(roots)).toBe(entry);
    for (const key of LEGACY_SOURCE_ROOT_KEYS) {
      const changed: any = { ...roots };
      if (key === 'videoId') changed[key] = 'AAAAAAAAAAA';
      else if (key === 'frames') changed[key] = entry.frames + 1;
      else if (key === 'sampleRate') changed[key] = 44100;
      else if (key === 'channels') changed[key] = 1;
      else changed[key] = 'f'.repeat(64);
      expect(findLegacySourceRoots(changed), `${entry.manifestId}:${key}`).toBeNull();
    }
  }
});

it('transport parses every exact wire and rejects cross-ID and changed body', () => {
  for (let i = 0; i < 19; i++) {
    const e = LEGACY_INVENTORY_ENTRIES[i];
    expect(recognizedLegacyManifestId(e.manifestId)).toBe(true);
    expect(legacyInventoryEntryByManifestId(e.manifestId)).toBe(e);
    const parsed = parseLegacySidecarManifest(
      new TextEncoder().encode(e.publicWire),
      { manifestId: e.manifestId },
    );
    expect(parsed.id).toBe(e.manifestId);
    const other = LEGACY_INVENTORY_ENTRIES[(i + 1) % 19];
    expect(() =>
      parseLegacySidecarManifest(new TextEncoder().encode(e.publicWire), {
        manifestId: other.manifestId,
      }),
    ).toThrow(/legacy_sidecar_/);
    const changed = e.publicWire.replace(e.encodedAudioSha256, 'f'.repeat(64));
    expect(() =>
      parseLegacySidecarManifest(new TextEncoder().encode(changed), {
        manifestId: e.manifestId,
      }),
    ).toThrow(/legacy_sidecar_/);
  }
  expect(recognizedLegacyManifestId('f'.repeat(64))).toBe(false);
  expect(legacyInventoryEntryByManifestId('f'.repeat(64))).toBeNull();
});
