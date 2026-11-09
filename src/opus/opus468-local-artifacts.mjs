// Private BUILD resolver only. No audio acquisition, policy admission or
// caller-selected asset URL. Complete audio/descriptor verification is repeated.
import wasmUrl from '../opus-codec/opus-decoder.wasm?url';
import {readVerifiedOpusByRoots} from './opus-cache.mjs';
import {sha256} from './opus-descriptor.mjs';
const WASM='8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b';
const WASM_BYTES=93685;
export async function resolveOpus468LocalArtifacts(roots,{signal}={}){
 signal?.throwIfAborted();if(roots.decoderWasmSha256!==WASM)throw Error('extension_decoder_identity');
 const cached=await readVerifiedOpusByRoots(roots,{signal});if(!cached)throw Error('extension_audio_cache_missing');
 const response=await fetch(wasmUrl,{signal,redirect:'error',credentials:'same-origin'});if(!response.ok||!response.body)throw Error('extension_decoder_unavailable');
 const reader=response.body.getReader(),wasm=new Uint8Array(WASM_BYTES);let offset=0;
 try{for(;;){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;if(offset+value.byteLength>WASM_BYTES)throw Error('extension_decoder_size');wasm.set(value,offset);offset+=value.byteLength;}}finally{await reader.cancel().catch(()=>{});}
 if(offset!==WASM_BYTES||await sha256(wasm)!==WASM)throw Error('extension_decoder_identity');signal?.throwIfAborted();
 return {audioBytes:new Uint8Array(cached.bytes).slice(),descriptorBytes:cached.descriptorBytes.slice(),decoderWasmBytes:wasm};
}
