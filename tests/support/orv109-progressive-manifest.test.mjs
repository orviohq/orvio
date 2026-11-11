import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { manifestTools } from './orv109-progressive-manifest.mjs';

const root = (process.env.ORVIO_SOURCE_ROOT ?? `${process.cwd()}/src`).replace(/\/$/, '') + '/';
const data = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
function source(path) { return stripTypeScriptTypes(readFileSync(root + path, 'utf8'), { mode: 'transform' }); }
const timing = data(source('timing.ts'));
const segments = await import(data(source('progressive/segments.ts').replace("'../canonical-pcm.mjs'", JSON.stringify(`file://${root}canonical-pcm.mjs`))));
const trust = await import(data(source('progressive/manifest-trust.ts')));
const { ProgressiveAudioClock } = await import(data(source('progressive/progressive-clock.ts').replace("'../timing'", JSON.stringify(timing))));
const { inspectWav } = await import(`file://${root}canonical-pcm.mjs`);
const tools = manifestTools({ ...segments, ...trust, inspectWav });

function wavFixture() {
  const rate = 44100, frames = rate * 3, bytes = new ArrayBuffer(44 + frames * 4), v = new DataView(bytes);
  v.setUint32(0, 0x52494646); v.setUint32(4, bytes.byteLength - 8, true); v.setUint32(8, 0x57415645);
  v.setUint32(12, 0x666d7420); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 2, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true); v.setUint32(36, 0x64617461);
  v.setUint32(40, frames * 4, true);
  for (let i = 44; i < bytes.byteLength; i += 2) v.setInt16(i, (i % 1024) - 512, true);
  return { bytes, frames, sampleRate: rate };
}
async function fixture() {
  const wav = wavFixture();
  const record = { videoId: 'abcdefghijk', audioSha256: await segments.hash(wav.bytes),
    frames: wav.frames, sampleRate: wav.sampleRate, chartSetSha256: 'b'.repeat(64),
    charts: Object.fromEntries([4,5,6,7,8].flatMap(l => ['low','mid','high','sc'].map(d => [`${l}:${d}`, { notes: [{id:0,time:1,lane:0}] }])) ) };
  return { ...wav, record, ...(await tools.prepare(wav.bytes, record, record.videoId)) };
}
function fakeContext() {
  const starts = [], buffers = [];
  return { starts, buffers, currentTime: 10, state: 'suspended', baseLatency: 0, outputLatency: 0,
    destination: {}, createGain: () => ({gain:{value:1},connect(){}}),
    async resume(){this.state='running';}, async suspend(){this.state='suspended';},
    createBuffer(channels, frames, rate){ const b={channels,frames,rate,copyToChannel(){}}; buffers.push(b); return b; },
    createBufferSource(){return {connect(){},disconnect(){},stop(){},start(...args){starts.push(args);}};},
  };
}

test('local full WAV produces metadata-only manifest, preserves all 20 chart objects', async () => {
  const f = await fixture(), snapshot = structuredClone(f.record);
  const prepared = await tools.prepare(f.bytes, f.record, f.record.videoId);
  assert.deepEqual(f.record, snapshot);
  assert.equal(Object.keys(f.record.charts).length, 20);
  assert.equal(prepared.manifest.parts.length, 2);
  assert.ok(prepared.manifest.parts.every(p => !Object.hasOwn(p, 'bytes')));
  assert.equal(await trust.checkManifestBinding(prepared.manifest, prepared.pin), 'verified');
});
test('first verified 2 seconds schedule with only first range bytes, before complete remote WAV', async () => {
  const f=await fixture(), context=fakeContext(), clock=new ProgressiveAudioClock(context);
  const bytes=f.bytes.slice(0,f.manifest.parts[0].byteLength);
  assert.ok(bytes.byteLength < f.bytes.byteLength);
  await tools.scheduleFirst({...f,bytes,clock});
  assert.deepEqual(context.starts, [[10.15,0]]);
  assert.equal(context.buffers[0].frames, 88200);
});
test('wrong full audio, video, frames and sample rate fail preparation', async () => {
  const f=await fixture();
  for(const patch of [{audioSha256:'0'.repeat(64)},{videoId:'xxxxxxxxxxx'},{frames:f.frames-1},{sampleRate:48000}])
    await assert.rejects(tools.prepare(f.bytes,{...f.record,...patch},f.record.videoId));
  const corrupt=f.bytes.slice(0); new Uint8Array(corrupt)[100]^=1;
  await assert.rejects(tools.prepare(corrupt,f.record,f.record.videoId));
});
test('old pin, corrupt chunk, reordered/truncated manifest and unbound geometry never start audio', async () => {
  const f=await fixture();
  const cases=[
    x=>{delete x.pin.manifestSha256;},
    x=>{new Uint8Array(x.bytes)[100]^=1;},
    x=>{x.manifest.parts.reverse();},
    x=>{x.manifest.parts.pop();},
    x=>{x.manifest.parts[0].frameCount--;},
    x=>{x.manifest.parts[0].byteLength--;},
    x=>{x.manifest.parts[0].pcmOffsetWithinSegment++;},
    x=>{x.manifest.parts[0].sha256='0'.repeat(64);},
  ];
  for(const mutate of cases){
    const x=structuredClone({manifest:f.manifest,pin:f.pin,record:f.record,bytes:f.bytes.slice(0,f.manifest.parts[0].byteLength)});
    mutate(x); const context=fakeContext(),clock=new ProgressiveAudioClock(context);
    await assert.rejects(tools.scheduleFirst({...x,clock})); assert.equal(context.starts.length,0);
  }
});
test('existing clock manual pause and underflow keep timeline frozen until verified next chunk', async () => {
  const f=await fixture(),context=fakeContext(),clock=new ProgressiveAudioClock(context);
  await tools.scheduleFirst({...f,bytes:f.bytes.slice(0,f.manifest.parts[0].byteLength),clock});
  context.currentTime=11; await clock.pause(); const paused=clock.now();
  assert.equal(clock.now(),paused); await clock.resume(); assert.equal(context.state,'running');
  context.currentTime=11.95; await clock.guard(f.manifest); assert.equal(clock.frozen,true);
  const frozen=clock.now(); await clock.resume(); assert.equal(clock.frozen,true); assert.equal(clock.now(),frozen);
  const part=f.manifest.parts[1],channels=await segments.verifySegment(part,f.bytes.slice(part.byteOffset));
  clock.scheduleSegment(part,channels,f.manifest); await clock.resumeFromFreeze();
  assert.equal(clock.frozen,false); assert.deepEqual(context.starts[1],[12.15,0]);
});
