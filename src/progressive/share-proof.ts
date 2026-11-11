// Unused new-share proof extension. Does not alter existing record/replay codecs.
// The recipient must accept the shared fragment as the sender's commitment;
// a provider response is never allowed to supply or replace the commitment.
import { decodeLocalAllKeysShare, encodeLocalAllKeysShare, LOCAL_ALLKEYS_SHARE_PREFIX, LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS, type LocalAllKeysShareInput } from '../local-allkeys-share';
import { validateManifest, makeSegments, hash } from './segments';
import { manifestSha256, checkManifestBinding } from './manifest-trust';
export const PROGRESSIVE_SHARE_PREFIX='v=local-allkeys-progressive-v1&d=';
const MAX_META=128*1024, MAX_TEXT=Math.ceil(MAX_META*4/3);
export const PROGRESSIVE_MAX_FRAGMENT_CHARS=LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS+MAX_TEXT+150;
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
function b64(bytes:Uint8Array){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64(text:string){if(!text||text.length>MAX_TEXT||!/^[A-Za-z0-9_-]+$/.test(text)||text.length%4===1)throw Error('Invalid manifest encoding');const raw=atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4));if(raw.length>MAX_META)throw Error('Manifest too large');const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(b64(bytes)!==text)throw Error('Noncanonical manifest encoding');return bytes;}
async function pinned(manifest:any,record:any,commitment:string){validateManifest(manifest,record);if(!/^[a-f0-9]{64}$/.test(commitment))throw Error('Invalid shared commitment');const pin={videoId:record.videoId,audioSha256:record.audioSha256,chartSetSha256:record.chartSetSha256,manifestSha256:commitment};if(await checkManifestBinding(manifest,pin)!=='verified')throw Error('Unverified manifest');return pin;}
export async function encodeProgressiveShare(input:LocalAllKeysShareInput, canonicalWav:ArrayBuffer,signal?:AbortSignal){
  signal?.throwIfAborted();const bytes=canonicalWav.slice(0);
  const legacy=await encodeLocalAllKeysShare(input,{signal});const verified=await decodeLocalAllKeysShare(legacy,{signal}),record=verified.record.record;
  if(await hash(bytes)!==record.audioSha256)throw Error('Full canonical WAV identity mismatch');
  const generated=await makeSegments(bytes,record.videoId,2),manifest={...generated,parts:generated.parts.map(({bytes,...part}:any)=>part)};
  const commitment=await manifestSha256(manifest);await pinned(manifest,record,commitment);signal?.throwIfAborted();
  const json=enc.encode(JSON.stringify(manifest));if(json.length>MAX_META)throw Error('Manifest too large');
  return PROGRESSIVE_SHARE_PREFIX+legacy.slice(LOCAL_ALLKEYS_SHARE_PREFIX.length)+'&pm='+b64(json)+'&mh='+commitment;
}
export async function decodeProgressiveShare(fragment:string,signal?:AbortSignal){
  signal?.throwIfAborted();if(typeof fragment!=='string'||fragment.length>PROGRESSIVE_MAX_FRAGMENT_CHARS||!fragment.startsWith(PROGRESSIVE_SHARE_PREFIX))throw Error('Not a new progressive share');
  const rest=fragment.slice(PROGRESSIVE_SHARE_PREFIX.length),parts=rest.split('&');if(parts.length!==3||!parts[1].startsWith('pm=')||!parts[2].startsWith('mh='))throw Error('Invalid progressive fields');
  const legacy=LOCAL_ALLKEYS_SHARE_PREFIX+parts[0];if(legacy.length>LOCAL_ALLKEYS_MAX_FRAGMENT_CHARS)throw Error('Share too large');
  const verified=await decodeLocalAllKeysShare(legacy,{signal}),manifest=JSON.parse(dec.decode(unb64(parts[1].slice(3)))),pin=await pinned(manifest,verified.record.record,parts[2].slice(3));signal?.throwIfAborted();
  return {verified,manifest,pin};
}
