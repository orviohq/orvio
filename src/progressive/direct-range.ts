// Isolated, unused transport candidate. Caller supplies an independently accepted
// new-share commitment and an already validated frozen record. No playback here.
// providerOrigin must come from the approved runtime configuration, NEVER from
// the shared fragment or provider response. No provider host is stored in shares.
import { validateManifest, verifySegment } from './segments';
import { checkManifestBinding, ManifestTrustError } from './manifest-trust';
export class DirectIntegrityError extends Error {}
export class DirectServiceError extends Error {}
const strong = (s: unknown): s is string => typeof s === 'string' && /^"[\x21\x23-\x7e]+"$/.test(s);
function check(signal?: AbortSignal) { signal?.throwIfAborted(); }
async function interruptible<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  check(signal); let onAbort=()=>{};
  const aborted=new Promise<never>((_,reject)=>{onAbort=()=>reject(signal.reason);signal.addEventListener('abort',onAbort,{once:true});});
  try {return await Promise.race([work,aborted]);} finally {signal.removeEventListener('abort',onAbort);}
}
export async function readVerifiedPart(input: {
  manifest: any; record: any; pin: any; index: number;
  providerOrigin: string; publicKey: string; etag?: string; signal?: AbortSignal; fetcher?: typeof fetch;
}) {
  const { manifest: m, record: r, pin: p } = structuredClone({manifest:input.manifest,record:input.record,pin:input.pin});
  const {index, etag} = input;
  const signal=AbortSignal.any([...(input.signal?[input.signal]:[]),AbortSignal.timeout(15000)]);
  check(signal); try {validateManifest(m,r);} catch(error){throw new DirectIntegrityError(error instanceof Error?error.message:String(error));}
  let binding;
  try { binding = await checkManifestBinding(m,p); } catch(error) { if(error instanceof ManifestTrustError) throw new DirectIntegrityError(error.message); throw error; }
  if(p?.videoId!==r.videoId || p?.audioSha256!==r.audioSha256 || p?.chartSetSha256!==r.chartSetSha256 ||
    binding!=='verified') throw new DirectIntegrityError('Trusted new-share manifest required');
  check(signal);
  if(!Number.isSafeInteger(index)||index<0||index>=m.parts.length || (index>0&&!strong(etag)) || (etag!==undefined&&!strong(etag))) throw Error('Invalid part or ETag');
  if(!/^[A-Za-z0-9_-]{11}$/.test(r.videoId)) throw Error('Invalid video identity');
  const part=m.parts[index], end=part.byteOffset+part.byteLength-1;
  const origin=new URL(input.providerOrigin);
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Trusted HTTPS provider origin required');
  if(typeof input.publicKey!=='string'||!input.publicKey||/[\r\n]/.test(input.publicKey))throw Error('Provider authentication required');
  const headers:Record<string,string>={Authorization:`Bearer ${input.publicKey}`,Range:`bytes=${part.byteOffset}-${end}`};
  if(etag!==undefined) headers['If-Range']=etag;
  let pending;
  try {
    pending=(input.fetcher??fetch)(`${origin.origin}/v1/videos/${r.videoId}/audio?format=bestaudio%2Fbest&audio-format=wav`,{headers,signal,redirect:'error',credentials:'omit'}).catch(()=>{if(signal.aborted)throw signal.reason;throw new DirectServiceError('Audio service request failed');}).then(response=>{if(signal.aborted){void response.body?.cancel().catch(()=>{});throw signal.reason;}return response;});
  } catch(error) { if(signal.aborted) throw signal.reason; throw new DirectServiceError('Audio service request failed'); }
  const response=await interruptible(pending,signal);
  let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  try {
    check(signal);
    const actual=response.headers.get('ETag');
    if(response.status!==206||response.redirected) throw new DirectServiceError('Audio service responded ' + response.status);
    if(!strong(actual)||(etag!==undefined&&actual!==etag)||
      response.headers.get('Content-Range')!==`bytes ${part.byteOffset}-${end}/${m.byteLength}`) throw new DirectIntegrityError('Unverified range response');
    const length=response.headers.get('Content-Length');
    if(length!==null&&length!==String(part.byteLength)) throw new DirectIntegrityError('Invalid range length');
    if(!response.body) throw new DirectServiceError('Missing range body');
    reader=response.body.getReader();
    const output=new Uint8Array(part.byteLength);let offset=0;
    const cancel=()=>{void reader?.cancel().catch(()=>{});};
    signal?.addEventListener('abort',cancel,{once:true});
    try {
      while(true){check(signal);let readResult;try{readResult=await reader.read();}catch(error){if(signal.aborted)throw signal.reason;throw new DirectServiceError('Audio service stream failed');}const {done,value}=readResult;check(signal);if(done)break;
        if(!(value instanceof Uint8Array)||value.length>output.length-offset)throw new DirectIntegrityError('Oversized range');output.set(value,offset);offset+=value.length;}
    } finally {signal?.removeEventListener('abort',cancel);}
    if(offset!==output.length) throw new DirectServiceError('Truncated range');
    check(signal); let channels;try {channels=await verifySegment(part,output.buffer);} catch(error){throw new DirectIntegrityError(error instanceof Error?error.message:String(error));}check(signal);
    return {channels,etag:actual,part,bytesRead:offset,bytes:output.buffer};
  } catch(error){if(reader)await reader.cancel().catch(()=>{});else await response.body?.cancel().catch(()=>{});throw error;}
  finally {reader?.releaseLock();}
}
