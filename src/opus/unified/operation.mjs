// Fixed producer operation. Every input is copied, verified and decoded before
// generation. No extension/chart/version/policy can be supplied by the caller.
import { generateUnified468Charts } from './core-adapter.mjs';
import {
  assembleOpus468Extension,
  bindOpus468Base,
  sha256Hex,
} from './record.mjs';
import { verifyUnifiedRecipe, UNIFIED_RECIPE } from './recipe.generated.mjs';
import { makeUnifiedDerivationVerifier } from './derivation.mjs';
import {
  parseVerifiedDescriptor,
  verifyEncodedParts,
} from '../opus-descriptor.mjs';
import { decodeVerifiedOpus } from '../../opus-codec/verified-opus-client.mjs';
import { parsePinnedPcmAnalysis } from '../opus-pcm-analysis.mjs';
import { verifyOpusRecord } from '../opus-record';
import { UNIFIED468_GENERATOR } from '../opus468-version-dispatch.mjs';
const verifyDerivation = makeUnifiedDerivationVerifier(
  generateUnified468Charts,
);
export async function generateUnifiedExtension({
  audioBytes,
  descriptorBytes,
  decoderWasmBytes,
  baseRecordRaw,
}) {
  if (
    typeof baseRecordRaw !== 'string' ||
    !baseRecordRaw.length ||
    new TextEncoder().encode(baseRecordRaw).length > 1572864
  )
    throw Error('generate_base_raw');
  if (
    !(audioBytes instanceof Uint8Array) ||
    !(descriptorBytes instanceof Uint8Array) ||
    !(decoderWasmBytes instanceof Uint8Array)
  )
    throw Error('generate_buffers');
  const raw = baseRecordRaw,
    base = JSON.parse(raw),
    db = descriptorBytes.slice(),
    audio = audioBytes.slice(),
    wasm = decoderWasmBytes.slice();
  if (!verifyUnifiedRecipe()) throw Error('generate_source_binding');
  const descriptorSha256 = sha256Hex(db);
  if (base.audioDescriptorSha256 !== descriptorSha256)
    throw Error('generate_descriptor_base_root');
  const descriptor = await parseVerifiedDescriptor(db, descriptorSha256);
  await verifyEncodedParts(audio, descriptor);
  if (!(await verifyOpusRecord(base, descriptor, descriptorSha256)))
    throw Error('generate_base_v2_integrity');
  const roots = bindOpus468Base({
    baseRecordRaw: raw,
    baseRecord: base,
    descriptor,
    descriptorSha256,
  });
  const decoded = await decodeVerifiedOpus({
    bytes: audio,
    wasmBytes: wasm,
    expected: descriptor,
    yieldAfterChunk: false,
  });
  const parsed = parsePinnedPcmAnalysis(decoded.pcm16, decoded.frames),
    generated = generateUnified468Charts(parsed);
  const extension = assembleOpus468Extension({
    baseRecordRaw: raw,
    baseRecord: base,
    descriptor,
    descriptorSha256,
    generatedCharts: generated.charts,
    generatorVersion: UNIFIED468_GENERATOR,
  });
  const regeneration = verifyDerivation({
    parsed,
    record: extension,
    baseRecordRaw: raw,
    baseRecord: base,
    descriptor,
    descriptorSha256,
  });
  if (
    !regeneration.ok ||
    regeneration.level !== 2 ||
    regeneration.canonicalRecordMatch !== true ||
    regeneration.extensionSha256Match !== true
  )
    throw Error('generate_regeneration');
  return {
    kind: 'orvio-autochart468-c3unified-candidate-v1',
    extension,
    roots,
    proof: {
      ok: true,
      recipeSha256: UNIFIED_RECIPE.recipeSha256,
      sourceCount: UNIFIED_RECIPE.sources.length,
      regenerationLevel: 2,
      canonicalRecordMatch: true,
      extensionSha256Match: true,
    },
    qualified: false,
    admission: 'PENDING_RELEASE',
    releaseCandidate: true,
  };
}
