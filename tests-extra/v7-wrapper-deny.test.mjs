// 0127 narrow tests: REAL build-owned wrapper validateRecoveredV7 + REAL
// createOpus468LocalReplayCodec + REAL createOpus468FreshChartReader/Consumer.
// Test-only loader shims (labeled): @noble/hashes sha256 -> node:crypto, and
// codec-parser/opus-decoder/wasm/resample stubs (imported by unified/v7 chain but
// never executed here). NOT vitest, NOT workerd/browser proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const LOADER = `
const u=(s)=>'data:text/javascript,'+encodeURIComponent(s);
const NOBLE=u(\`import {createHash} from 'node:crypto';
export const sha256=(b)=>new Uint8Array(createHash('sha256').update(b).digest());
sha256.create=()=>{const h=createHash('sha256');return {update(b){h.update(b);return this},digest(){return new Uint8Array(h.digest())}}};\`);
const CODEC=u('export default class CodecParser{parseChunk(){return []}flush(){return []}}');
const OPUS=u('export class OpusDecoder{static module;async decodeFrames(){return {}}free(){}}');
const STUB=u('export default new Uint8Array(0);export function stream(){return {}}');
export async function resolve(s,c,n){
 if(s.startsWith('@noble/hashes/'))return {url:NOBLE,shortCircuit:true};
 if(s==='codec-parser')return {url:CODEC,shortCircuit:true};
 if(s==='opus-decoder')return {url:OPUS,shortCircuit:true};
 if(s==='@audio/resample-polyphase'||s.endsWith('.wasm'))return {url:STUB,shortCircuit:true};
 return n(s,c);}`;
register('data:text/javascript,' + encodeURIComponent(LOADER), import.meta.url);

const { validateRecoveredV7 } =
  await import('../src/opus/opus468-versioned-v7-validation.mjs');
const { createOpus468LocalReplayCodec } =
  await import('../src/opus/opus468-local-replay-codec.ts');
const { createOpus468FreshChartReader } =
  await import('../src/opus/opus468-fresh-reader.mjs');
const {
  createVersioned468Codec,
  LEGACY468_GENERATOR: OLD,
  UNIFIED468_GENERATOR: NEW,
} = await import('../src/opus/opus468-version-dispatch.mjs');

const sha = (b) => createHash('sha256').update(b).digest('hex');
const H = (c) => c.repeat(64);
const descBytes = new Uint8Array(
  readFileSync(
    new URL('../test-support/opus35-frost/descriptor.json', import.meta.url),
  ),
);
const NOTES = [[1, 100, 0]];
const notesSha = sha(new TextEncoder().encode(JSON.stringify(NOTES)));
const POLICY = (g) => ({
  generatorVersion: g,
  producerSha256: H('a'),
  recipeSha256: H('b'),
  corpusSha256: H('c'),
});

function candidate(generator) {
  const ext = {
    generatorVersion: generator,
    videoId: 'CORPUSB0002',
    audioSha256: H('1'),
    baseChartSetSha256: H('2'),
    extensionSha256: H('3'),
    encodedAudioSha256: H('4'),
    baseSourceRecordSha256: H('5'),
    audioDescriptorSha256: sha(descBytes),
    charts: { '4:low': { notes: NOTES, sha256: notesSha } },
  };
  const song = `yt-opus-${ext.videoId}-${ext.audioSha256}-c${ext.baseChartSetSha256}-x${ext.extensionSha256}`;
  return {
    baseSourceRecordJson: '{"v":1}',
    extension: ext,
    descriptorBytes: Uint8Array.from(descBytes),
    replay: {
      version: 1,
      song,
      lanes: 4,
      difficulty: 'low',
      options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 1 },
      ops: [],
      end: 1000,
    },
    title: 't',
    author: null,
  };
}
// configured reader DENY: policyRows [] (the build default). Counters prove the
// trusted exchange / derived verifier are never reached.
function denyCodec() {
  const calls = { exchange: 0, derived: 0 };
  const codec = createOpus468LocalReplayCodec({
    readerOptions: {
      consumerOptions: {
        policyRows: [],
        verifyDerivedRecord: async () => {
          calls.derived++;
          return true;
        },
      },
      trustedExchange: async () => {
        calls.exchange++;
        throw Error('must not be called');
      },
    },
  });
  return { codec, calls };
}
function allowCodec(generator) {
  const calls = { exchange: 0, derived: 0 };
  const codec = createOpus468LocalReplayCodec({
    readerOptions: {
      consumerOptions: {
        policyRows: [POLICY(generator)],
        loadedProducerIdentity: {
          producerSha256: H('a'),
          recipeSha256: H('b'),
        },
        verifyDerivedRecord: async () => {
          calls.derived++;
          return true;
        },
      },
      trustedExchange: async ({ requestId, admission }) => {
        calls.exchange++;
        const e = admission.extension;
        return {
          requestId,
          verdict: {
            ok: true,
            version: 1,
            kind: 'orvio-opus468-admission-verdict-v1',
            durable: false,
            song: `yt-opus-${e.videoId}-${e.audioSha256}-c${e.baseChartSetSha256}-x${e.extensionSha256}`,
            extensionSha256: e.extensionSha256,
            videoId: e.videoId,
            baseSourceRecordSha256: e.baseSourceRecordSha256,
            baseChartSetSha256: e.baseChartSetSha256,
            audioSha256: e.audioSha256,
            audioDescriptorSha256: e.audioDescriptorSha256,
            encodedAudioSha256: e.encodedAudioSha256,
            decoderWasmSha256: e.decoderWasmSha256,
            pipelineVersion: e.pipelineVersion,
            frames: e.frames,
            sampleRate: e.sampleRate,
            channels: e.channels,
            policy: POLICY(e.generatorVersion),
            playableKeys: ['4:low'],
          },
        };
      },
    },
  });
  return { codec, calls };
}
const spy = (codec) => {
  const s = { encode: 0, inputs: [], results: [] };
  return {
    s,
    codec: {
      encode(i, o) {
        s.encode++;
        s.inputs.push(i);
        const p = codec.encode(i, o);
        p.then(
          (r) => s.results.push(r),
          () => {},
        );
        return p;
      },
    },
  };
};

for (const [name, gen] of [
  ['legacy nmguard', OLD],
  ['unified c3', NEW],
]) {
  test(`${name}: valid candidate + configured reader DENY -> rejected, no encode output, reader exchange/derived never reached`, async () => {
    const { codec, calls } = denyCodec();
    const { s, codec: sp } = spy(codec);
    await assert.rejects(
      validateRecoveredV7(candidate(gen), sp),
      /fresh_generator_unqualified/,
    );
    assert.equal(s.encode, 1);
    assert.equal(s.results.length, 0);
    assert.deepEqual(calls, { exchange: 0, derived: 0 });
  });
  test(`${name}: positive control - same candidate with qualified policy produces wire bytes (tests are not vacuous)`, async () => {
    const { codec, calls } = allowCodec(gen);
    const out = await validateRecoveredV7(candidate(gen), codec);
    assert.ok(out instanceof Uint8Array && out.length > 152);
    assert.equal(calls.exchange, 1);
    assert.equal(calls.derived, 1);
    // local decode of that wire under DENY config must also reject
    const { codec: deny } = denyCodec();
    await assert.rejects(deny.decode(out), /fresh_generator_unqualified/);
  });
}

test('unknown/caller-selected generator: rejected before codec is touched (codec calls = 0)', async () => {
  const { codec } = allowCodec(NEW);
  const { s, codec: sp } = spy(codec);
  for (const g of [
    'caller-selected',
    undefined,
    null,
    'research-c3-x',
    OLD + '-x',
  ]) {
    // NOTE: real wrapper throws SYNCHRONOUSLY here (not a rejected promise); callers must await inside try/async.
    assert.throws(
      () => validateRecoveredV7(candidate(g), sp),
      /extension_generator_unsupported/,
    );
  }
  assert.equal(s.encode, 0);
});

test('selected-branch codec error propagates unchanged, one codec call only, no fallback to other branch', async () => {
  for (const gen of [OLD, NEW]) {
    let n = 0;
    const codec = {
      encode: async () => {
        n++;
        throw Error('branch_boom');
      },
    };
    await assert.rejects(
      validateRecoveredV7(candidate(gen), codec),
      /^Error: branch_boom$/,
    );
    assert.equal(n, 1);
  }
  await assert.rejects(
    validateRecoveredV7(candidate(NEW), {}),
    /share468_codec|codec/,
  ); // missing encode fails closed
});

test('abort: pre-aborted signal rejects before codec; mid-flight abort rejects; DENY still never reaches exchange', async () => {
  const { codec, calls } = allowCodec(NEW);
  const { s, codec: sp } = spy(codec);
  const pre = new AbortController();
  pre.abort(Error('stop'));
  await assert.rejects(
    validateRecoveredV7(candidate(NEW), sp, { signal: pre.signal }),
    /stop/,
  );
  assert.equal(s.encode, 0);
  const mid = new AbortController();
  const slow = {
    encode: (_i, { signal }) =>
      new Promise((_, rej) =>
        signal.addEventListener('abort', () => rej(signal.reason)),
      ),
  };
  const p = validateRecoveredV7(candidate(NEW), slow, { signal: mid.signal });
  mid.abort(Error('midstop'));
  await assert.rejects(p, /midstop/);
  assert.equal(calls.exchange, 0);
});

test('snapshot: codec receives a detached clone; caller mutation after call cannot change what the codec validates', async () => {
  const c = candidate(NEW);
  let seen;
  const codec = {
    encode: async (i) => {
      seen = i;
      await Promise.resolve();
      return new Uint8Array([1]);
    },
  };
  const p = validateRecoveredV7(c, codec);
  c.extension.generatorVersion = OLD;
  c.replay.lanes = 8;
  c.descriptorBytes[0] ^= 1;
  await p;
  assert.notEqual(seen.extension, c.extension);
  assert.equal(seen.extension.generatorVersion, NEW);
  assert.equal(seen.replay.lanes, 4);
  assert.notEqual(seen.descriptorBytes[0], c.descriptorBytes[0]);
});

test('versioned codec (createVersioned468Codec) routes exact branch; unknown wire/generator fails with no fallback', () => {
  const calls = [];
  const mk = (n) => ({
    encode: (i) => {
      calls.push(n);
      return n;
    },
    decode: () => n,
  });
  const v = createVersioned468Codec({
    legacy: mk('legacy'),
    unified: mk('unified'),
  });
  assert.equal(v.encode(candidate(OLD)), 'legacy');
  assert.equal(v.encode(candidate(NEW)), 'unified');
  assert.throws(
    () => v.encode(candidate('x')),
    /extension_generator_unsupported/,
  );
  assert.deepEqual(calls, ['legacy', 'unified']);
});
