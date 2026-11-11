import assert from 'node:assert/strict';
import {test} from 'node:test';
import {getEventListeners} from 'node:events';
import {acquireYoutubeAudio,YOUTUBE_DIRECT_ABSOLUTE_DEADLINE_MS} from '../src/youtube-direct-api.ts';
import {makePcm16StereoWav} from './youtube-direct-fixture.ts';
const fixture=makePcm16StereoWav({sampleRate:44100,frames:3,samples:[-32768,32767,-123,456,0,1]});
const flush=async()=>{for(let i=0;i<50;i++)await Promise.resolve()};
const options={publicKey:'unit-only-public-key'};
test('a progressing WAV download taking 100s survives the old flat 90s',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});let stream!:ReadableStreamDefaultController<Uint8Array>;
 const body=new ReadableStream<Uint8Array>({start(c){stream=c}});
 const p=acquireYoutubeAudio('unitTest_01',{...options,fetch:async()=>new Response(body,{headers:{'Content-Length':String(fixture.bytes.length)}})});
 const done=p.then(value=>({ok:true as const,value}),error=>({ok:false as const,error}));await flush();
 stream.enqueue(fixture.bytes.subarray(0,44));await flush();
 for(let i=0;i<5;i++){t.mock.timers.tick(20000);stream.enqueue(fixture.bytes.subarray(44+i*2,46+i*2));await flush()}
 stream.enqueue(fixture.bytes.subarray(54));stream.close();await flush();const r=await done;assert.equal(r.ok,true,'real nonempty byte progress must not hit flat90');if(r.ok)assert.equal(r.value.audioSha256,fixture.audioSha256);
});
test('scheduled Retry-After120s is honored but cannot extend absolute195s',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});let calls=0;const p=acquireYoutubeAudio('unitTest_01',{...options,fetch:async()=>++calls===1?new Response(null,{status:202,headers:{'Retry-After':'120'}}):new Response(fixture.bytes)});const done=p.then(value=>({ok:true as const,value}),error=>({ok:false as const,error}));await flush();t.mock.timers.tick(119999);await flush();assert.equal(calls,1);t.mock.timers.tick(1);await flush();assert.equal((await done).ok,true);assert.equal(calls,2);
});
test('endless202 cannot renew the absolute ceiling and must not request beyond it',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});let calls=0;const caller=new AbortController();const p=acquireYoutubeAudio('unitTest_01',{...options,signal:caller.signal,fetch:async()=>{calls++;return new Response(null,{status:202,headers:{'Retry-After':'20'}})}});const rejected=assert.rejects(p,(e:any)=>e.code==='request_timeout');await flush();for(let i=0;i<10;i++){t.mock.timers.tick(20000);await flush()}await rejected;assert.ok(calls<=10);assert.ok(Date.now()>=1000+YOUTUBE_DIRECT_ABSOLUTE_DEADLINE_MS);assert.equal(getEventListeners(caller.signal,'abort').length,0);
});
test('caller cancel during scheduled wait settles immediately and removes listener',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});const caller=new AbortController();let calls=0;const reason=new Error('caller cancel');const p=acquireYoutubeAudio('unitTest_01',{...options,signal:caller.signal,fetch:async()=>{calls++;return new Response(null,{status:202,headers:{'Retry-After':'120'}})}});const rejected=assert.rejects(p,e=>e===reason);await flush();caller.abort(reason);await rejected;t.mock.timers.tick(300000);await flush();assert.equal(calls,1);assert.equal(getEventListeners(caller.signal,'abort').length,0);
});
