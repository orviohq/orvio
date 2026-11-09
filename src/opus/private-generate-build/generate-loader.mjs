// PRIVATE loader template. Build replaces roots; no imported record can choose them.
const WORKER_SHA256 = '5cdfdd5e0080596947249e0c501f677d8df33fa385af5be9e6c2e3c7bc1cded2';
const BUILD_ROOT_SHA256 = '06b2e11582e4ec93784d733275bcef1c71d039def60efe218897c27f1323f6f5';
const WORKER_NAME = 'generate-worker.5cdfdd5e0080596947249e0c501f677d8df33fa385af5be9e6c2e3c7bc1cded2.mjs';
const WORKER_BYTES = 395766;
export const generateBuildIdentity = Object.freeze({workerSha256:WORKER_SHA256, buildRootSha256:BUILD_ROOT_SHA256});
const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), b=>b.toString(16).padStart(2,'0')).join('');
export async function generateExtensionInOwnedWorker({audioBytes,descriptorBytes,decoderWasmBytes,baseRecordRaw,signal}) {
  signal?.throwIfAborted();
  const buffers = [audioBytes, descriptorBytes, decoderWasmBytes];
  if (buffers.some(b=>!(b instanceof ArrayBuffer)) || new Set(buffers).size!==3) throw Error('owned_buffers_required');
  // Detach all caller buffers before the first await. Objects are cloned at the same boundary.
  const owned = structuredClone({audioBytes,descriptorBytes,decoderWasmBytes,baseRecordRaw},{transfer:buffers});
  let worker, blobUrl;
  try {
    const url = new URL('./generate-worker.5cdfdd5e0080596947249e0c501f677d8df33fa385af5be9e6c2e3c7bc1cded2.mjs',import.meta.url);
    if (url.origin!==location.origin || (url.protocol!=='https:' && !['localhost','127.0.0.1'].includes(url.hostname))) throw Error('build_origin');
    const response = await fetch(url,{signal,redirect:'error',credentials:'same-origin',cache:'no-store'});
    if (!response.ok || response.url!==url.href) throw Error('build_fetch');
    const reader=response.body?.getReader();
    if(!reader)throw Error('build_body');
    const chunks=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>WORKER_BYTES)throw Error('build_worker_size');chunks.push(value);}}catch(e){await reader.cancel();throw e;}
    if(size!==WORKER_BYTES)throw Error('build_worker_size');
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    if (await digest(bytes)!==WORKER_SHA256) throw Error('build_worker_identity');
    signal?.throwIfAborted();
    blobUrl=URL.createObjectURL(new Blob([bytes],{type:'text/javascript'}));
    worker=new Worker(blobUrl,{type:'module'});
    return await new Promise((resolve,reject)=>{
      let done=false;
      const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
      const abort=()=>finish(signal.reason??new DOMException('Aborted','AbortError'));
      const timer=setTimeout(()=>finish(Error('candidate_worker_timeout')),180000);
      signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted){abort();return;}
      worker.onmessage=({data})=>{if(data?.ok===true)finish(null,{...data.result,loadedBuild:generateBuildIdentity});else finish(Error('generate_worker_failed:'+String(data?.error??'unknown')));};
      worker.onerror=()=>finish(Error('generate_worker_failed'));
      worker.postMessage(owned,[owned.audioBytes,owned.descriptorBytes,owned.decoderWasmBytes]);
    });
  } finally {
    worker?.terminate();
    if(blobUrl)URL.revokeObjectURL(blobUrl);
  }
}
