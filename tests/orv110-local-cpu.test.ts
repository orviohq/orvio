import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {decodeLocalAllKeysShare,encodeLocalAllKeysShare} from '../src/local-allkeys-share';
it('reports local codec CPU only, not Workers CPU qualification',async()=>{
const f=JSON.parse(readFileSync('tests/fixtures/local-allkeys-public.json','utf8'));
const initial=await decodeLocalAllKeysShare(f.shareFragment);
const large=structuredClone(initial.replay);large.end=600000;large.ops=Array.from({length:12000},(_,i)=>[1,i*50,Math.min(599,i*.05)]);
const big=await encodeLocalAllKeysShare({record:initial.record,replay:large});
for(const [name,fragment] of [['fixture',f.shareFragment],['12000-operation-bound',big]] as const){
 const samples=[];
 for(let i=0;i<5;i++){const cpu=process.cpuUsage(),start=performance.now();const x=await decodeLocalAllKeysShare(fragment);const decoded=process.cpuUsage(cpu),decodeWall=performance.now()-start;const canonical=await encodeLocalAllKeysShare({record:x.record,replay:x.replay});const used=process.cpuUsage(cpu);expect(canonical).toBe(fragment);samples.push({wallMs:performance.now()-start,cpuMs:(used.user+used.system)/1000,decodeCpuMs:(decoded.user+decoded.system)/1000,decodeWallMs:decodeWall,encodeCpuMs:(used.user+used.system-decoded.user-decoded.system)/1000});}
 console.log(JSON.stringify({name,fragmentChars:fragment.length,ops:name==='fixture'?initial.replay.ops.length:12000,samples,environment:process.version,qualification:'local process measurements only; not Workers isolate CPU; record/chart maximum and inflate ceiling not exhausted'}));
}
},30000);
