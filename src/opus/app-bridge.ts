import ChartWorkerUrl from './opus-chart.worker.mjs?worker&url';
import DecoderUrl from '../opus-codec/opus-decoder.wasm?url';
import { prepareOpusSource } from './prepare-opus.mjs';
import { readVerifiedOpus } from './opus-cache.mjs';
import { parseVerifiedDescriptor } from './opus-descriptor.mjs';
import { AUDIO_BASE } from '../external-audio-api';
import type { OpusRecord } from './opus-record';
export interface PreparedOpus {kind:'orvio-opus-v1';record:OpusRecord;bytes:ArrayBuffer;restored:boolean;descriptor:any;descriptorSha256:string}
// The built DecoderUrl embeds the pinned decoder content hash, so one cache
// entry can never serve a different decoder build. The shared fetch is keyed
// by that URL and refcounted: one caller's abort rejects that caller promptly
// without cancelling the fetch other restores still need, while the LAST
// caller leaving aborts the network fetch and drops the entry so nothing runs
// without an owner and a later call retries fresh. A failure clears the entry
// for the same reason and is never cached; a resolved entry is reused. Each
// caller gets a private copy because the worker transfer detaches its buffer.
let wasmShared:{url:string;promise:Promise<ArrayBuffer>;controller:AbortController;users:number;settled:boolean}|undefined;
function detachWasmUser(entry:{controller:AbortController;users:number;settled:boolean}&{url:string;promise:Promise<ArrayBuffer>}){
 entry.users--;
 if(!entry.users&&!entry.settled){
  if(wasmShared===entry)wasmShared=undefined;
  entry.controller.abort();
 }
}
async function wasm(signal?:AbortSignal){
 signal?.throwIfAborted();
 if(!wasmShared||wasmShared.url!==DecoderUrl){
  const controller=new AbortController();
  const entry={url:DecoderUrl,controller,users:0,settled:false,promise:fetch(DecoderUrl,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('opus_decoder_unavailable');return r.arrayBuffer();})};
  wasmShared=entry;
  void entry.promise.then(()=>{entry.settled=true;}).catch(()=>{entry.settled=true;if(wasmShared===entry)wasmShared=undefined;});
 }
 const entry=wasmShared;
 entry.users++;
 let abort:()=>void=()=>{};
 try{
  const bytes=await Promise.race([
   entry.promise,
   new Promise<never>((_,reject)=>{abort=()=>reject(signal?.reason);signal?.addEventListener('abort',abort,{once:true});}),
  ]);
  signal?.throwIfAborted();
  return bytes.slice(0);
 }finally{
  signal?.removeEventListener('abort',abort);
  detachWasmUser(entry);
 }
}
export async function prepareOpusJob(videoId:string,job:any,signal:AbortSignal,onStage?:any):Promise<PreparedOpus>{
 const result=await prepareOpusSource({base:AUDIO_BASE,videoId,oggSha256:job.audio.oggSha256,descriptorSha256:job.audio.descriptorSha256,workerUrl:ChartWorkerUrl,wasmBytes:await wasm(signal),signal,onStage,expectedPcmSha:job.audio.sha256,expectedOggBytes:job.audio.sizeBytes});
 if(result.record.audioSha256!==job.audio.sha256||result.descriptor.oggBytes!==job.audio.sizeBytes)throw Error('opus_job_descriptor_mismatch');
 return{kind:'orvio-opus-v1',record:result.record,bytes:result.pcm16,restored:result.restored,descriptor:result.descriptor,descriptorSha256:result.descriptorSha256};
}
const META='orvio.opus-catalog.v1';
export async function saveOpusMetadata(r:OpusRecord,title:string,author?:string,jobId?:string,descriptor?:any){const list=await listOpusMetadata();const row={record:r,descriptor,title:title.slice(0,300),author:author?.slice(0,100),jobId};const key=r.audioDescriptorSha256;const old=list.find(x=>x.record.audioDescriptorSha256===key);if(old&&JSON.stringify(old.record)!==JSON.stringify(r))throw Error('opus_frozen_record_changed');localStorage.setItem(META,JSON.stringify([...list.filter(x=>x.record.audioDescriptorSha256!==key),row]));}
export async function listOpusMetadata():Promise<{record:OpusRecord;title:string;author?:string;jobId?:string;descriptor?:any}[]>{if(typeof localStorage==='undefined')return [];const raw=JSON.parse(localStorage.getItem(META)||'[]');if(!Array.isArray(raw))throw Error('opus_catalog_shape');const {verifyOpusRecord}=await import('./opus-record');const out=[];for(const row of raw)if(typeof row?.title==='string'&&await verifyOpusRecord(row.record))out.push(row);return out;}
export async function restoreOpusRecord(record:OpusRecord,signal?:AbortSignal):Promise<ArrayBuffer>{
 const row=(await listOpusMetadata()).find(x=>x.record.audioDescriptorSha256===record.audioDescriptorSha256);
 let d=row?.descriptor;
 if(!d){const descriptorResponse=await fetch(`${AUDIO_BASE}/v1/opus-sources/${record.videoId}/${record.encodedAudioSha256}/descriptor`,{signal});if(descriptorResponse.status!==200)throw Error('opus_descriptor_missing');const descriptorBytes=new Uint8Array(await descriptorResponse.arrayBuffer());d=await parseVerifiedDescriptor(descriptorBytes,record.audioDescriptorSha256);}
 const result=await prepareOpusSource({base:AUDIO_BASE,videoId:record.videoId,oggSha256:record.encodedAudioSha256,descriptorSha256:record.audioDescriptorSha256,workerUrl:ChartWorkerUrl,wasmBytes:await wasm(signal),signal,cachedDescriptor:d,frozenRecord:record});if(result.record.chartSetSha256!==record.chartSetSha256)throw Error('opus_frozen_chart_changed');return result.pcm16;
}
