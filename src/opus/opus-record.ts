import type { SourceRecord } from '../external-source';
export type OpusRecord = Omit<SourceRecord, 'version' | 'sourceProvenance'> & {
  version: 2;
  audioFormat: 'orvio-opus-v1';
  audioDescriptorSha256: string;
  encodedAudioSha256: string;
  decoderWasmSha256: string;
  sourceProvenance: 'local-opus35-v1';
};
export type PlayableSourceRecord = SourceRecord | OpusRecord;
import { validSourceRecord, verifyChartHashes } from '../external-source';
import { FORMAT, PIPELINE, DECODER } from './opus-descriptor.mjs';
const hash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
export function validOpusRecord(
  r: any,
  d?: any,
  descriptorSha?: string,
): r is OpusRecord {
  if (
    !r ||
    r.manifestSha256 !== undefined ||
    r.version !== 2 ||
    r.audioFormat !== FORMAT ||
    r.pipelineVersion !== PIPELINE ||
    r.sampleRate !== 48000 ||
    !hash(r.audioSha256) ||
    !hash(r.chartSetSha256) ||
    !hash(r.audioDescriptorSha256) ||
    !hash(r.encodedAudioSha256) ||
    r.decoderWasmSha256 !== DECODER ||
    r.sourceProvenance !== 'local-opus35-v1'
  )
    return false;
  if (
    d &&
    (r.videoId !== d.videoId ||
      r.frames !== d.frames ||
      r.audioSha256 !== d.pcm16Sha256 ||
      r.encodedAudioSha256 !== d.oggSha256 ||
      r.audioDescriptorSha256 !== descriptorSha)
  )
    return false;
  // Reuse unchanged chart structural checks on an internal projection only.
  // Never send/persist this projection or broaden the legacy validator.
  return validSourceRecord({
    ...r,
    version: 1,
    sourceProvenance: 'local-current35-v1',
  });
}
export async function verifyOpusRecord(
  r: any,
  d?: any,
  descriptorSha?: string,
): Promise<boolean> {
  return (
    validOpusRecord(r, d, descriptorSha) &&
    (await verifyChartHashes({
      ...r,
      version: 1,
      sourceProvenance: 'local-current35-v1',
    }))
  );
}
export function bindNewOpusRecord(
  generated: any,
  d: any,
  descriptorSha: string,
) {
  const r = {
    ...generated,
    version: 2,
    audioFormat: FORMAT,
    audioSha256: d.pcm16Sha256,
    audioDescriptorSha256: descriptorSha,
    encodedAudioSha256: d.oggSha256,
    decoderWasmSha256: d.decoderWasmSha256,
    pipelineVersion: PIPELINE,
    sampleRate: 48000,
    frames: d.frames,
    sourceProvenance: 'local-opus35-v1',
  };
  if (!validOpusRecord(r, d, descriptorSha)) throw Error('opus_record_shape');
  return r;
}
