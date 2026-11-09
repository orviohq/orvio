// PRIVATE browser transport candidate for NEW owner-audio projection protocol.
// Not imported by production, not a chart admission verdict, no deployed route.
// Build-owned endpoint only. Public anonymous read, NOT caller authentication.
export const OPUS_PROJECTION_CANDIDATE_ENDPOINT='https://orvio-share.pn-26f.workers.dev/v1/opus-owner-audio-projection';
const KIND='orvio-opus-owner-audio-projection-v1',H=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x),V=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{11}$/.test(x);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const REQ=['version','requestId','videoId','encodedAudioSha256'];
const OK=['version','kind','requestId','ok','videoId','encodedAudioSha256','audioDescriptorSha256','audioSha256','decoderWasmSha256','frames','sampleRate','channels','currentAtConfirmation'];
const DENY=['version','kind','requestId','ok','error'];
// Cancellation does not depend on a supplied fetch/body honoring its signal.
// Cancel promises are detached: hostile underlying cancel() may never settle.
const cancelBody=body=>{try{Promise.resolve(body?.cancel()).catch(()=>{});}catch{}};
function waitForSignal(promise,signal,onLate){
 if(!signal)return Promise.resolve(promise);
 return new Promise((resolve,reject)=>{
  let settled=false;
  const abort=()=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);reject(signal.reason);};
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(promise).then(value=>{if(settled){if(signal.aborted){try{onLate?.(value);}catch{}}return;}settled=true;signal.removeEventListener('abort',abort);resolve(value);},error=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);reject(error);});
  if(signal.aborted)abort();
 });
}
export function createPrivateOpusProjectionTransport({fetchImpl=globalThis.fetch}={}){
 if(typeof fetchImpl!=='function')throw Error('owner_transport_dependency');
 return Object.freeze({async exchange(input,{signal}={}){
  signal?.throwIfAborted();
  if(!exact(input,REQ)||input.version!==1||!H(input.requestId)||!V(input.videoId)||!H(input.encodedAudioSha256))throw Error('owner_transport_request');
  const request=structuredClone(input),body=JSON.stringify(request);
  // Single exchange. No retry, cookies, bearer, HMAC key, imported URL or redirects.
  const r=await waitForSignal(fetchImpl(OPUS_PROJECTION_CANDIDATE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body,signal,credentials:'omit',redirect:'error',cache:'no-store',mode:'cors',referrerPolicy:'no-referrer'}),signal,r=>cancelBody(r?.body));
  if(signal?.aborted){cancelBody(r.body);signal.throwIfAborted();}
  const rejectResponse=code=>{cancelBody(r.body);throw Error(code);};
  if(!r.ok||r.redirected||r.url!==OPUS_PROJECTION_CANDIDATE_ENDPOINT||!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(r.headers.get('Content-Type')||'')||!r.body)return rejectResponse('owner_transport_response');
  const declared=r.headers.get('Content-Length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>2048))return rejectResponse('owner_transport_response_size');
  const bytes=new Uint8Array(2048),reader=r.body.getReader();let used=0;
  try{for(;;){signal?.throwIfAborted();const {done,value}=await waitForSignal(reader.read(),signal);signal?.throwIfAborted();if(done)break;if(!(value instanceof Uint8Array)||used+value.length>bytes.length)throw Error('owner_transport_response_size');bytes.set(value,used);used+=value.length;}}
  finally{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}
  signal?.throwIfAborted();let projection;try{projection=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,used)));}catch{throw Error('owner_transport_response_json');}
  if(projection?.version!==1||projection.kind!==KIND||projection.requestId!==request.requestId)throw Error('owner_transport_response_binding');
  if(projection.ok===false){if(!exact(projection,DENY)||projection.error!=='owner_audio_unavailable')throw Error('owner_transport_response_binding');return Object.freeze(projection);}
  if(!exact(projection,OK)||projection.ok!==true||projection.videoId!==request.videoId||projection.encodedAudioSha256!==request.encodedAudioSha256||!H(projection.audioDescriptorSha256)||!H(projection.audioSha256)||!H(projection.decoderWasmSha256)||!Number.isSafeInteger(projection.frames)||projection.frames<1||projection.frames>14400000||projection.sampleRate!==48000||projection.channels!==2||projection.currentAtConfirmation!==true)throw Error('owner_transport_response_binding');
  return Object.freeze(projection);
 }});
}
