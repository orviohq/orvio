// Private byte-bound manifest fetch. Local cancellation settles independently
// of fetch/read/cancel cooperation. No network-stop or no-signal deadline claim.
import {sha256Hex} from './opus468-record.mjs';
const cancelBody=body=>{try{Promise.resolve(body?.cancel()).catch(()=>{});}catch{}};
function waitForSignal(pending,signal,onLate){
 if(!signal)return Promise.resolve(pending);
 return new Promise((resolve,reject)=>{
  let done=false;
  const abort=()=>{if(done)return;done=true;signal.removeEventListener('abort',abort);reject(signal.reason);};
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(pending).then(value=>{if(done){if(signal.aborted)try{onLate?.(value);}catch{}return;}done=true;signal.removeEventListener('abort',abort);resolve(value);},error=>{if(done)return;done=true;signal.removeEventListener('abort',abort);reject(error);});
  if(signal.aborted)abort();
 });
}
export async function readFixedManifest(url,{size,sha256,code,signal}){
 signal?.throwIfAborted();
 const response=await waitForSignal(fetch(url,{signal,redirect:'error',credentials:'same-origin',cache:'no-store'}),signal,r=>cancelBody(r?.body));
 if(signal?.aborted){cancelBody(response.body);signal.throwIfAborted();}
 if(!response.ok||!response.body){cancelBody(response.body);throw Error(code+'_unavailable');}
 const reader=response.body.getReader(),bytes=new Uint8Array(size);let offset=0;
 try{for(;;){signal?.throwIfAborted();const {done,value}=await waitForSignal(reader.read(),signal);signal?.throwIfAborted();if(done)break;if(!(value instanceof Uint8Array)||offset+value.byteLength>size)throw Error(code+'_size');bytes.set(value,offset);offset+=value.byteLength;}}
 finally{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}
 if(offset!==size||sha256Hex(bytes)!==sha256)throw Error(code+'_identity');
 signal?.throwIfAborted();
}
