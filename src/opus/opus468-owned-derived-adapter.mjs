// PRIVATE code-proof adapter ONLY, not a qualification or owner admission gate.
// Fixed import is the reviewed1056build artifact, never chosen by input data.
import {verifyCandidateInOwnedWorker} from '../../private-build/candidate-loader.mjs';
const WORKER='05b5c30e6a62c027147ae10e9694149fa79accb321bb6dd422a61f08314cb0e8';
const BUILD='2213363ed07e7959adf807961ebba2c54b78617f4ac41837056ea1f003f02297';
const RECIPE='7229a1f49a16fef1bb4e8c6c29426a87ba108d690274ad065a319203e225fc15';
const GENERATOR='opus468-testonly-c2nested-gap010-burst8-decor17c-union468-fftfix-v0-unqualified';
const WASM='8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b';
const copy=x=>structuredClone(x),hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
const owned=x=>x instanceof Uint8Array&&x.buffer instanceof ArrayBuffer?x.slice():x instanceof ArrayBuffer?new Uint8Array(x.slice(0)):null;
/** resolveArtifacts is trusted BUILD CODE, resolving the exact current local
 * encoded/descriptor/WASM artifacts by the supplied bound roots, not arbitrary
 * URLs from a record. It returns {audioBytes,descriptorBytes,decoderWasmBytes}.
 * Resources are snapshotted and hash-bound again before fixed-loader transfer.
 * This bool verifies derivation ONLY. The consumer must gate trusted policy
 * before calling it and separately require fresh owning COMMITTED authority.
 * Current GENERATOR is deliberately unqualified and will be rejected by the
 * accepted consumer even if listed. Direct private true is NOT product consent.
 */
export function createOpus468OwnedDerivedVerifier({resolveArtifacts}={}){
 if(typeof resolveArtifacts!=='function')throw Error('owned_artifact_resolver_missing');
 return async function verifyDerivedRecord(extension,context={}){
  let e,c;
  try{e=copy(extension);c=copy(context);}catch{return false;}
  try{
   if(e?.generatorVersion!==GENERATOR||typeof c.baseRecordRaw!=='string'||typeof c.descriptorSha256!=='string')return false;
   const base=JSON.parse(c.baseRecordRaw);
   if(JSON.stringify(base)!==JSON.stringify(c.baseRecord)||e.baseSourceRecordSha256!==await hash(new TextEncoder().encode(c.baseRecordRaw))||
    e.baseChartSetSha256!==base.chartSetSha256||e.videoId!==base.videoId||e.audioSha256!==base.audioSha256||
    e.audioDescriptorSha256!==c.descriptorSha256||e.audioDescriptorSha256!==base.audioDescriptorSha256||
    e.encodedAudioSha256!==base.encodedAudioSha256||e.decoderWasmSha256!==WASM||base.decoderWasmSha256!==WASM)return false;
   const resources=await resolveArtifacts(copy({videoId:e.videoId,audioSha256:e.audioSha256,encodedAudioSha256:e.encodedAudioSha256,audioDescriptorSha256:e.audioDescriptorSha256,decoderWasmSha256:WASM,baseSourceRecordSha256:e.baseSourceRecordSha256}));
   // Snapshot before the first byte-hash await. Shared buffers are rejected.
   const audio=owned(resources?.audioBytes),descriptor=owned(resources?.descriptorBytes),wasm=owned(resources?.decoderWasmBytes);
   if(!audio||!descriptor||!wasm)return false;
   if(await hash(audio)!==e.encodedAudioSha256||await hash(descriptor)!==e.audioDescriptorSha256||await hash(wasm)!==WASM)return false;
   const decodedDescriptor=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(descriptor));
   if(JSON.stringify(decodedDescriptor)!==JSON.stringify(c.descriptor))return false;
   const verdict=await verifyCandidateInOwnedWorker({audioBytes:audio.buffer,descriptorBytes:descriptor.buffer,decoderWasmBytes:wasm.buffer,record:e,baseRecordRaw:c.baseRecordRaw});
   const s=verdict?.steps;
   return verdict?.ok===true&&verdict.scope==='provenance_chain'&&Array.isArray(verdict.scopes)&&
    JSON.stringify(verdict.scopes)===JSON.stringify(['source_binding','descriptor_pin','pcm_pin','regeneration'])&&Array.isArray(verdict.failures)&&verdict.failures.length===0&&
    verdict.loadedBuild?.workerSha256===WORKER&&verdict.loadedBuild?.buildRootSha256===BUILD&&
    s?.source_binding?.ok===true&&s.source_binding.recipeHash===RECIPE&&s.source_binding.sources===12&&
    s.descriptor_pin?.ok===true&&s.descriptor_pin.descriptorSha256===e.audioDescriptorSha256&&s.descriptor_pin.pcm16Sha256===e.audioSha256&&s.descriptor_pin.frames===e.frames&&
    s.pcm_pin?.ok===true&&s.pcm_pin.decoderSha256===WASM&&s.pcm_pin.pcm16Sha256===e.audioSha256&&s.pcm_pin.frames===e.frames&&
    s.regeneration?.ok===true&&s.regeneration.level===2&&s.regeneration.extensionSha256Match===true&&s.regeneration.canonicalRecordMatch===true;
  }catch{return false;}
 };
}
