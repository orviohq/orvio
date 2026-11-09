// PRIVATE local binary contract candidate, NOT a production URL/server format.
import {createOpus468FreshChartReader} from './opus468-fresh-reader.mjs';
import {validateRuntimeReplay,type RuntimeReplay} from '../replay';
const TE=new TextEncoder(),TD=new TextDecoder('utf-8',{fatal:true});
const MAGIC=TE.encode('ORV468L1');
// Four independent exact byte sections avoid nested JSON/base double escaping.
const CAPS=[1572864,1572864,32768,2097152] as const;
const HEADER=8+4*4+4*32;
export const OPUS468_LOCAL_REPLAY_MAX_BYTES=HEADER+CAPS.reduce((a,b)=>a+b,0);
const copy=<T>(x:T):T=>structuredClone(x);
const fail=(s:string):never=>{throw Error(s);};
const exact=(o:any,required:string[],optional:string[]=[])=>o&&typeof o==='object'&&!Array.isArray(o)&&required.every(k=>Object.hasOwn(o,k))&&Object.keys(o).every(k=>required.includes(k)||optional.includes(k));
const hash=async(b:Uint8Array)=>new Uint8Array(await crypto.subtle.digest('SHA-256',b as BufferSource));
const hex=(b:Uint8Array)=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
function strictReplay(raw:any,song:string):RuntimeReplay{
 if(!exact(raw,['version','song','lanes','difficulty','options','ops','end'],['audioLeadIn','fever'])||
  !exact(raw.options,['speed','fader','shuffle','seed'])||
  (raw.fever!==undefined&&!exact(raw.fever,['version','rulesId','auto']))||![4,6,8].includes(raw.lanes))fail('extension_share_replay_shape');
 const replay=validateRuntimeReplay(raw,id=>id===song);
 if(!replay)throw Error('extension_share_replay_invalid');return replay;
}
interface PackageInput{baseSourceRecordJson:string;extension:any;descriptorBytes:Uint8Array;replay:RuntimeReplay}
/** readerOptions is trusted BUILD configuration, NEVER a package field. It must
 * retain qualified policy-first gating, local structural/derived validation and
 * real fresh owner transport. Current test-only candidate/default[] is denied.
 * Section hashes detect corruption only, not authority. No journal/receipt is
 * serialized. Parsing cannot install or register a song, execute audio/Engine,
 * persist a pin, create a link, send a message or authorize a producer.
 */
export function createOpus468LocalReplayCodec({readerOptions={},makeReader=createOpus468FreshChartReader}:{readerOptions?:any;makeReader?:typeof createOpus468FreshChartReader}={}){
 const reader=makeReader(readerOptions);
 async function validate(input:PackageInput,signal?:AbortSignal){
  signal?.throwIfAborted();
  if(!exact(input,['baseSourceRecordJson','extension','descriptorBytes','replay'])||typeof input.baseSourceRecordJson!=='string'||!(input.descriptorBytes instanceof Uint8Array)||!(input.descriptorBytes.buffer instanceof ArrayBuffer))fail('extension_share_input');
  const e=input.extension;
  const song=`yt-opus-${e?.videoId}-${e?.audioSha256}-c${e?.baseChartSetSha256}-x${e?.extensionSha256}`;
  const replay=strictReplay(input.replay,song);
  const request={version:1,videoId:e.videoId,encodedAudioSha256:e.encodedAudioSha256,baseSourceRecordJson:input.baseSourceRecordJson,extension:e};
  const chart=await reader.readChart(request,input.descriptorBytes,{lanes:replay.lanes,difficulty:replay.difficulty},{signal});
  const selected=e.charts[`${replay.lanes}:${replay.difficulty}`];
  if(!selected?.notes||hex(await hash(TE.encode(JSON.stringify(chart.frozenNotes))))!==selected.sha256)fail('extension_share_selected_chart');
  signal?.throwIfAborted();
  return{...input,replay,song,selectedChartSha256:selected.sha256,frozenNotes:chart.frozenNotes};
 }
 return Object.freeze({
  async encode(input:PackageInput,{signal}:{signal?:AbortSignal}={}){
   const snapshot=copy(input);
   const sections=[TE.encode(snapshot.baseSourceRecordJson),TE.encode(JSON.stringify(snapshot.extension)),snapshot.descriptorBytes,TE.encode(JSON.stringify(snapshot.replay))];
   for(let i=0;i<4;i++)if(!(sections[i] instanceof Uint8Array)||!sections[i].length||sections[i].length>CAPS[i])fail('extension_share_section_limit');
   // Policy/authority validation is mandatory even for a locally generated file.
   await validate(snapshot,signal);
   const total=HEADER+sections.reduce((n,s)=>n+s.length,0),bytes=new Uint8Array(total),view=new DataView(bytes.buffer);
   bytes.set(MAGIC);let offset=HEADER;
   for(let i=0;i<4;i++){view.setUint32(8+i*4,sections[i].length,false);bytes.set(await hash(sections[i]),24+i*32);bytes.set(sections[i],offset);offset+=sections[i].length;signal?.throwIfAborted();}
   return bytes;
  },
  async decode(input:Uint8Array,{signal}:{signal?:AbortSignal}={}){
   signal?.throwIfAborted();
   if(!(input instanceof Uint8Array)||!(input.buffer instanceof ArrayBuffer)||input.length<HEADER||input.length>OPUS468_LOCAL_REPLAY_MAX_BYTES)fail('extension_share_wire_limit');
   const bytes=input.slice(),view=new DataView(bytes.buffer),sections:Uint8Array[]=[];
   if(!MAGIC.every((x,i)=>bytes[i]===x))fail('extension_share_version');
   let total=HEADER;
   for(let i=0;i<4;i++){const length=view.getUint32(8+i*4,false);if(length<1||length>CAPS[i])fail('extension_share_section_limit');total+=length;}
   if(total!==bytes.length)fail('extension_share_wire_length');
   let offset=HEADER;
   for(let i=0;i<4;i++){const n=view.getUint32(8+i*4,false),section=bytes.slice(offset,offset+n),actual=await hash(section);if(!actual.every((b,j)=>b===bytes[24+i*32+j]))fail('extension_share_section_integrity');sections.push(section);offset+=n;signal?.throwIfAborted();}
   let baseSourceRecordJson='',extension:any,replay:any;
   try{baseSourceRecordJson=TD.decode(sections[0]);JSON.parse(baseSourceRecordJson);const extRaw=TD.decode(sections[1]),replayRaw=TD.decode(sections[3]);extension=JSON.parse(extRaw);replay=JSON.parse(replayRaw);if(JSON.stringify(extension)!==extRaw||JSON.stringify(replay)!==replayRaw)fail('extension_share_noncanonical');}catch{fail('extension_share_json');}
   return validate({baseSourceRecordJson,extension,descriptorBytes:sections[2],replay},signal);
  },
 });
}
