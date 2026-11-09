// NEW split protocol: local chart derivation and owner audio currentness are
// independent checks. An audio projection is never a chart admission verdict.
import {createOpus468Consumer} from './opus468-consumer.mjs';
import {parseVerifiedDescriptor} from './opus-descriptor.mjs';
const copy=x=>structuredClone(x),fail=x=>{throw Error(x);};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const KEYS=['version','kind','requestId','ok','videoId','encodedAudioSha256','audioDescriptorSha256','audioSha256','decoderWasmSha256','frames','sampleRate','channels','currentAtConfirmation'];
const ROOTS=['videoId','encodedAudioSha256','audioDescriptorSha256','audioSha256','decoderWasmSha256','frames','sampleRate','channels'];
const REQUEST=['version','videoId','encodedAudioSha256','baseSourceRecordJson','extension'];
export function createOpus468ProjectionChartReader({consumerOptions={},exchangeProjection}={}){
 const options={...consumerOptions,policyRows:copy(consumerOptions.policyRows??[]),loadedProducerIdentity:copy(consumerOptions.loadedProducerIdentity)};
 createOpus468Consumer(options);
 if(typeof options.verifyDerivedRecord!=='function'||typeof exchangeProjection!=='function')fail('projection_reader_dependencies');
 return Object.freeze({async readChart(input,descriptorBytes,selection,{signal}={}){
  const request=copy(input),bytes=copy(descriptorBytes),choice=copy(selection);
  if(!exact(request,REQUEST)||request.version!==1||!exact(choice,['lanes','difficulty'])||![4,6,8].includes(choice.lanes)||!['low','mid','high','sc'].includes(choice.difficulty))fail('fresh_request');
  const e=request.extension;
  if(!e||e.videoId!==request.videoId||e.encodedAudioSha256!==request.encodedAudioSha256)fail('fresh_request_binding');
  const policy=options.policyRows.find(p=>p.generatorVersion===e.generatorVersion),loaded=options.loadedProducerIdentity;
  if(!policy||!loaded||loaded.producerSha256!==policy.producerSha256||loaded.recipeSha256!==policy.recipeSha256)fail('fresh_generator_unqualified');
  signal?.throwIfAborted();
  const d=await parseVerifiedDescriptor(bytes,e.audioDescriptorSha256),base=JSON.parse(request.baseSourceRecordJson);
  if(e.videoId!==d.videoId||e.encodedAudioSha256!==d.oggSha256||e.audioSha256!==d.pcm16Sha256||e.decoderWasmSha256!==d.decoderWasmSha256||e.frames!==d.frames||e.sampleRate!==d.sampleRate||e.channels!==d.channels)fail('projection_local_roots');
  if(await options.verifyDerivedRecord(e,{baseRecordRaw:request.baseSourceRecordJson,baseRecord:base,descriptor:d,descriptorSha256:e.audioDescriptorSha256,signal})!==true)fail('fresh_derived_record');
  signal?.throwIfAborted();
  const requestId=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
  const projection=copy(await exchangeProjection({version:1,requestId,videoId:e.videoId,encodedAudioSha256:e.encodedAudioSha256},{signal}));
  signal?.throwIfAborted();
  if(!exact(projection,KEYS)||projection.version!==1||projection.kind!=='orvio-opus-owner-audio-projection-v1'||projection.requestId!==requestId||projection.ok!==true||projection.currentAtConfirmation!==true||ROOTS.some(k=>projection[k]!==e[k]))fail('projection_current_audio_binding');
  // Local immutable input snapshots survive the await. Projection carries no
  // extension/producer/policy or playable claim. Those stay locally verified.
  const selected=e.charts?.[`${choice.lanes}:${choice.difficulty}`];
  if(!Array.isArray(selected?.notes)||selected.notes.length===0)fail('fresh_chart_unavailable');
  const song=`yt-opus-${e.videoId}-${e.audioSha256}-c${e.baseChartSetSha256}-x${e.extensionSha256}`;
  return copy({song,extensionSha256:e.extensionSha256,baseSourceRecordSha256:e.baseSourceRecordSha256,lanes:choice.lanes,difficulty:choice.difficulty,frozenNotes:selected.notes});
 }});
}
