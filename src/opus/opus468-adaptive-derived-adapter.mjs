// NEW private adaptive-derived adapter (FE owner request 12:06, v2 packet 1148).
// Implements the consumer's verifyDerivedRecord seam:
//   verifyDerivedRecord(extension, { baseRecordRaw, baseRecord, descriptor,
//     descriptorSha256, signal? }) -> Promise<boolean>
// Admission order stays in the REAL consumer: allowed()/policy (default []
// deny) runs in prepare BEFORE this verifier is invoked, so a denied generator
// never reaches the resolver or the worker. This module admits nothing.
// Fail-closed chain: snapshot -> base/descriptor/root cross-checks + canonical
// level-2 self-verify (actual pinned modules) -> build-owned resolver output
// re-hashed against the bound roots -> owned pinned-worker verdict requiring
// full safePCM decode + level-2 canonical regeneration matches.
// FE 12:11: context.signal is a LOCAL AbortSignal passed BY REFERENCE. It is
// never serialized, retained, or structuredCloned; the rest of the context is
// detached/copied. Exact signal identity is preserved into the resolver and
// the worker loader, and a late TRUE verdict after abort still rejects.
import { selfVerifyOpus468Extension, sha256Hex } from './opus468-record.mjs';
import { validOpusDescriptor } from './opus-descriptor.mjs';

const TE = new TextEncoder();

export function createOpus468AdaptiveDerivedVerifier({
  resolveArtifacts,
  verifyInWorker,
} = {}) {
  if (typeof resolveArtifacts !== 'function')
    throw Error('adapter_resolver_missing');
  if (typeof verifyInWorker !== 'function')
    throw Error('adapter_worker_missing');
  return async function verifyDerivedRecord(extension, context = {}) {
    const { signal } = context;
    if (signal !== undefined && !(signal instanceof AbortSignal)) return false;
    signal?.throwIfAborted();
    // Snapshot inputs before the first await; never clone the signal itself.
    if (!extension || typeof extension !== 'object' || Array.isArray(extension))
      return false;
    const ext = structuredClone(extension);
    const { baseRecordRaw, baseRecord, descriptor, descriptorSha256 } = context;
    if (typeof baseRecordRaw !== 'string' || !baseRecordRaw.length)
      return false;
    const raw = baseRecordRaw.slice();
    let base;
    try {
      base = JSON.parse(raw);
    } catch {
      return false;
    }
    if (!baseRecord || JSON.stringify(baseRecord) !== JSON.stringify(base))
      return false;
    if (
      !descriptor ||
      typeof descriptor !== 'object' ||
      Array.isArray(descriptor)
    )
      return false;
    const desc = structuredClone(descriptor);
    const dSha = typeof descriptorSha256 === 'string' ? descriptorSha256 : '';
    // 1. base raw root + descriptor root + cross-record root checks.
    if (
      !/^[a-f0-9]{64}$/.test(dSha) ||
      dSha !== base.audioDescriptorSha256 ||
      dSha !== ext.audioDescriptorSha256
    )
      return false;
    if (sha256Hex(TE.encode(raw)) !== ext.baseSourceRecordSha256) return false;
    if (validOpusDescriptor(desc) !== true) return false;
    if (
      ext.videoId !== desc.videoId ||
      base.videoId !== desc.videoId ||
      ext.encodedAudioSha256 !== desc.oggSha256 ||
      base.encodedAudioSha256 !== desc.oggSha256 ||
      ext.audioSha256 !== desc.pcm16Sha256 ||
      base.audioSha256 !== desc.pcm16Sha256 ||
      ext.decoderWasmSha256 !== desc.decoderWasmSha256 ||
      ext.frames !== desc.frames ||
      ext.sampleRate !== desc.sampleRate ||
      ext.channels !== desc.channels
    )
      return false;
    // 2. canonical level-2 self-verify through the actual pinned record module.
    try {
      selfVerifyOpus468Extension(ext, {
        baseRecordRaw: raw,
        baseRecord: base,
        descriptor: desc,
        descriptorSha256: dSha,
      });
    } catch {
      return false;
    }
    signal?.throwIfAborted();
    // 3. build-owned resolver: bound roots out, detached owned artifacts in.
    //    The resolver is never trusted: every artifact is re-hashed against the
    //    bound roots and buffers must be three distinct ArrayBuffers.
    const resolved = await resolveArtifacts(
      {
        videoId: ext.videoId,
        chartSetSha256: base.chartSetSha256,
        audioSha256: ext.audioSha256,
        encodedAudioSha256: ext.encodedAudioSha256,
        audioDescriptorSha256: dSha,
        decoderWasmSha256: desc.decoderWasmSha256,
        frames: desc.frames,
      },
      { signal },
    );
    signal?.throwIfAborted();
    // FE resolver (src/opus/opus468-local-artifacts.mjs
    // resolveOpus468LocalArtifacts, verified against the actual 1213 module)
    // returns Uint8Array COPIES { audioBytes, descriptorBytes,
    // decoderWasmBytes }. Never trusted: re-hash all three.
    if (!resolved || typeof resolved !== 'object') return false;
    const {
      audioBytes: audio,
      descriptorBytes: resolvedDescriptor,
      decoderWasmBytes: decoderWasm,
    } = resolved;
    if (
      !(audio instanceof Uint8Array) ||
      !(resolvedDescriptor instanceof Uint8Array) ||
      !(decoderWasm instanceof Uint8Array)
    )
      return false;
    if (sha256Hex(audio) !== ext.encodedAudioSha256) return false;
    if (sha256Hex(resolvedDescriptor) !== dSha) return false;
    if (sha256Hex(decoderWasm) !== desc.decoderWasmSha256) return false;
    // Hand the loader freshly detached, exactly-sized ArrayBuffers (it
    // transfers them into the owned worker); caller buffers stay untouched.
    const audioBytes = audio.slice().buffer;
    const descriptorBytes = resolvedDescriptor.slice().buffer;
    const decoderWasmBytes = decoderWasm.slice().buffer;
    signal?.throwIfAborted();
    // 4. owned pinned-worker verdict: exact worker sha (build root), 13-source
    //    recipe closure, descriptor pin, full safePCM decode, level-2 canonical
    //    regeneration. A late TRUE after abort still rejects above the return.
    const verdict = await verifyInWorker({
      audioBytes,
      descriptorBytes,
      decoderWasmBytes,
      record: ext,
      baseRecordRaw: raw,
      signal,
    });
    signal?.throwIfAborted();
    return (
      verdict?.ok === true &&
      verdict?.steps?.regeneration?.level === 2 &&
      verdict.steps.regeneration.extensionSha256Match === true &&
      verdict.steps.regeneration.canonicalRecordMatch === true
    );
  };
}
