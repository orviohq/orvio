import assert from 'node:assert/strict';
import {test} from 'node:test';
import {acquireYoutubeAudio} from '../src/youtube-direct-api.ts';
import {makePcm16StereoWav} from './youtube-direct-fixture.ts';
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve()};
test('healthy 202 sequence that becomes ready at 95 seconds completes rather than expiring preparation',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});
 const fixture=makePcm16StereoWav({sampleRate:44100,frames:3,samples:[-32768,32767,-123,456,0,1]});
 const waits=[20,20,20,20,15];const calls:number[]=[];
 const pending=acquireYoutubeAudio('unitTest_01',{publicKey:'unit-only-public-key',fetch:async()=>{
  calls.push(Date.now());const wait=waits[calls.length-1];
  return wait===undefined?new Response(fixture.bytes,{headers:{'Content-Length':String(fixture.bytes.length)}}):new Response(null,{status:202,headers:{'Retry-After':String(wait)}});
 }});
 const settled=pending.then(value=>({ok:true as const,value}),error=>({ok:false as const,error}));
 await flush();for(const seconds of waits){t.mock.timers.tick(seconds*1000);await flush()}
 const result=await settled;
 assert.equal(result.ok,true,'same URL is ready at 95s; current flat 90s total rejects before the next GET');
 if(result.ok)assert.equal(result.value.audioSha256,fixture.audioSha256);
 assert.deepEqual(calls,[1000,21000,41000,61000,81000,96000]);
});
