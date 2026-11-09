import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  captureAcquiredOpusV2,
  createAcquiredOpusV2Artifacts,
} from '../src/opus/opus-acquired-v2-artifacts.mjs';
import {
  parsePublicOpus35State,
  readOpus35Artifact,
  OPUS35_CREATE_ENABLED,
} from '../src/opus/opus35-api';
const descriptor = fs.readFileSync(
  new URL('../test-support/opus35-frost/descriptor.json', import.meta.url),
);
const d = JSON.parse(descriptor.toString()),
  sha = createHash('sha256').update(descriptor).digest('hex');
const base = {
  ok: true,
  version: 2,
  kind: 'orvio-opus-acquired-job-v2',
  jobId: '11111111-2222-4333-8444-555555555555',
  videoId: d.videoId,
};
const job = {
  ...base,
  status: 'verified',
  audio: {
    audioFormat: 'orvio-opus-v1',
    contentType: 'audio/ogg',
    sha256: d.pcm16Sha256,
    encodedAudioSha256: d.oggSha256,
    audioDescriptorSha256: sha,
    decoderWasmSha256: d.decoderWasmSha256,
    bytes: d.oggBytes,
    frames: d.frames,
    sampleRate: 48000,
    channels: 2,
  },
};
it('qualified release activation ON and verified exact7 fields remain bound', () => {
  expect(OPUS35_CREATE_ENABLED).toBe(true);
  expect(captureAcquiredOpusV2(job)).toEqual(job);
  for (const extra of [
    { url: 'https://evil.invalid' },
    { sourceRecord: {} },
    { owner: {} },
  ])
    expect(() => captureAcquiredOpusV2({ ...job, ...extra })).toThrow();
  expect(() => parsePublicOpus35State(job, 'XXXXXXXXXXX')).toThrow();
});
it('proposed separate pending/error/unknown shapes reject owner/private shapes', () => {
  for (const j of [
    { ...base, status: 'pending', phase: 'QUEUED', retryAfterSec: 5 },
    { ...base, status: 'unknown', phase: 'CODEC_RUNNING', canRetry: false },
    {
      ...base,
      status: 'error',
      phase: 'FAILED',
      code: 'unavailable',
      stage: 'status',
      canRetry: true,
    },
  ])
    expect(parsePublicOpus35State(j, d.videoId)).toEqual(j);
  for (const j of [
    { ...base, status: 'pending', phase: 'QUEUED' },
    { ...base, status: 'unknown', phase: 'CODEC_RUNNING', canRetry: true },
    { ...job, status: 'done' },
    { ...job, jobId: 'other' },
  ])
    expect(() => parsePublicOpus35State(j, d.videoId)).toThrow();
});
it('invalid artifacts never call network', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  try {
    await expect(
      readOpus35Artifact({ videoId: 'evil' }, { method: 'GET' }),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
it('already-aborted acquired preparation never reads artifacts', async () => {
  const readArtifact = vi.fn();
  const api = createAcquiredOpusV2Artifacts({ readArtifact });
  const c = new AbortController();
  c.abort();
  await expect(api.load(job, { signal: c.signal })).rejects.toThrow();
  expect(readArtifact).not.toHaveBeenCalled();
});
it('mid-flight worker cancellation terminates only owned worker', async () => {
  const { prepareOpusOwned } =
    await import('../src/opus/opus-chart-worker-client.mjs');
  const c = new AbortController();
  let terminated = 0;
  class FakeWorker {
    postMessage() {
      c.abort();
    }
    terminate() {
      terminated++;
    }
  }
  vi.stubGlobal('Worker', FakeWorker);
  try {
    await expect(
      prepareOpusOwned({
        workerUrl: 'local',
        bytes: new ArrayBuffer(1),
        wasmBytes: new ArrayBuffer(1),
        descriptorBytes: new ArrayBuffer(1),
        descriptorSha256: sha,
        signal: c.signal,
      }),
    ).rejects.toThrow('Aborted');
    expect(terminated).toBe(1);
  } finally {
    vi.unstubAllGlobals();
  }
});

import { validOpusDescriptor } from '../src/opus/opus-descriptor.mjs';
it('descriptor rejects undersized nonfinal parts and resampling drift', () => {
  expect(validOpusDescriptor(d)).toBe(true);
  const part = structuredClone(d);
  part.parts[0].bytes--;
  part.parts[1].bytes++;
  expect(validOpusDescriptor(part)).toBe(false);
  const drift = structuredClone(d);
  drift.frames += 2;
  expect(validOpusDescriptor(drift)).toBe(false);
});
it('public phases are fixed and codec errors cannot reset provider', () => {
  for (const j of [
    { ...base, status: 'pending', phase: 'anything', retryAfterSec: 5 },
    { ...base, status: 'unknown', phase: 'SENDING', canRetry: false },
    {
      ...base,
      status: 'error',
      phase: 'FAILED',
      code: 'unavailable',
      stage: 'codec',
      canRetry: true,
    },
  ])
    expect(() => parsePublicOpus35State(j, d.videoId)).toThrow();
  expect(
    parsePublicOpus35State(
      {
        ...base,
        status: 'error',
        phase: 'FAILED',
        code: 'unavailable',
        stage: 'codec',
        canRetry: false,
      },
      d.videoId,
    ).canRetry,
  ).toBe(false);
});

import {
  strictOpus35Record,
  strictOpus35Result,
  strictOpus35Replay,
} from '../src/opus/opus35-schema';
it('new nested privacy schema rejects result options omission and synthetic URL extras everywhere', () => {
  const root = new URL('../test-support/opus35-frost/', import.meta.url)
    .pathname;
  const record = JSON.parse(fs.readFileSync(root + 'record.json', 'utf8')),
    result = JSON.parse(fs.readFileSync(root + 'result.json', 'utf8')),
    replay = JSON.parse(fs.readFileSync(root + 'replay.json', 'utf8'));
  expect(strictOpus35Record(record)).toBe(true);
  expect(strictOpus35Result(result)).toBe(true);
  expect(strictOpus35Replay(replay)).toBe(true);
  const noOptions = { ...result };
  delete noOptions.options;
  expect(strictOpus35Result(noOptions)).toBe(false);
  for (const path of [[], ['options']]) {
    const q = structuredClone(result);
    let o = q;
    for (const k of path) o = o[k];
    o.url = 'https://private.invalid/synthetic';
    expect(strictOpus35Result(q)).toBe(false);
  }
  for (const path of [
    [],
    ['charts'],
    ['charts', '5:low'],
    ['charts', '5:low', 'notes', '0'],
    ['chartMetadata'],
    ['chartMetadata', '5:low'],
    ['chartMetadata', '5:low', 'rating'],
  ]) {
    const q = structuredClone(record);
    let o = q;
    for (const k of path) o = o[k];
    o.url = 'https://private.invalid/synthetic';
    expect(strictOpus35Record(q)).toBe(false);
  }
  for (const path of [[], ['options'], ['fever']]) {
    const q = structuredClone(replay);
    let o = q;
    for (const k of path) o = o[k];
    o.url = 'https://private.invalid/synthetic';
    expect(strictOpus35Replay(q)).toBe(false);
  }
  const config = structuredClone(record);
  config.config = JSON.stringify({
    ...JSON.parse(config.config),
    url: 'https://private.invalid/synthetic',
  });
  expect(strictOpus35Record(config)).toBe(false);
});

import { decodeOpus35Share } from '../src/opus/opus35-share';
import { shareB64, shareUnb64, shareTransform } from '../src/external-share';
import { sha256 } from '../src/opus/opus-descriptor.mjs';
it('actual v6 decoder rejects private extras rather than sanitizing a published fragment', async () => {
  const fragment = fs.readFileSync(
    new URL('../test-support/opus35-frost/v6-fragment.txt', import.meta.url),
    'utf8',
  );
  expect((await decodeOpus35Share(fragment)).record.videoId).toBe(d.videoId);
  const envelope = JSON.parse(
    new TextDecoder().decode(
      await shareTransform(shareUnb64(fragment.slice(6)), false),
    ),
  );
  for (const kind of [
    'no-options',
    'result-url',
    'options-url',
    'record-url',
    'chart-url',
    'metadata-url',
    'config-url',
  ]) {
    const q = structuredClone(envelope);
    if (kind === 'no-options') delete q.result.options;
    else if (kind === 'result-url')
      q.result.url = 'https://private.invalid/synthetic';
    else if (kind === 'options-url')
      q.result.options.url = 'https://private.invalid/synthetic';
    else {
      const r = JSON.parse(q.sourceRecord);
      if (kind === 'record-url') r.url = 'https://private.invalid/synthetic';
      if (kind === 'chart-url')
        r.charts['5:low'].notes[0].url = 'https://private.invalid/synthetic';
      if (kind === 'metadata-url')
        r.chartMetadata['5:low'].rating.url =
          'https://private.invalid/synthetic';
      if (kind === 'config-url')
        r.config = JSON.stringify({
          ...JSON.parse(r.config),
          url: 'https://private.invalid/synthetic',
        });
      q.sourceRecord = JSON.stringify(r);
      q.sourceRecordSha256 = await sha256(
        new TextEncoder().encode(q.sourceRecord),
      );
    }
    const changed =
      'v=6&d=' +
      shareB64(
        await shareTransform(new TextEncoder().encode(JSON.stringify(q)), true),
      );
    await expect(decodeOpus35Share(changed), kind).rejects.toThrow();
  }
});
import { parseOpus35Canonical } from '../src/opus/opus35-canonical.mjs';
import { decodeOpus35Song } from '../src/opus/opus35-song';
import { parseVerifiedDescriptor } from '../src/opus/opus-descriptor.mjs';
it('duplicate overwritten synthetic payload rejected with correct hashes in v6 and song', async () => {
  const fixture = (name: string) =>
    fs.readFileSync(
      new URL('../test-support/opus35-frost/' + name, import.meta.url),
      'utf8',
    );
  const encode = async (text: string, v: string) =>
    v +
    '&d=' +
    shareB64(await shareTransform(new TextEncoder().encode(text), true));
  for (const [name, version, decode] of [
    ['v6-fragment.txt', 'v=6', decodeOpus35Share],
    ['v2-song-fragment.txt', 'v=2', decodeOpus35Song],
  ] as const) {
    const fragment = fixture(name),
      outer = JSON.parse(
        new TextDecoder().decode(
          await shareTransform(shareUnb64(fragment.slice(6)), false),
        ),
      );
    const raw = JSON.stringify(outer);
    const dupOuter = raw.replace(
      '"title":',
      '"title":"https://private.invalid/synthetic","title":',
    );
    await expect(decode(await encode(dupOuter, version))).rejects.toThrow(
      'opus35_canonical_json',
    );
    const src = structuredClone(outer);
    src.sourceRecord = src.sourceRecord.replace(
      '"videoId":',
      '"videoId":"https://private.invalid/synthetic","videoId":',
    );
    src.sourceRecordSha256 = await sha256(
      new TextEncoder().encode(src.sourceRecord),
    );
    await expect(
      decode(await encode(JSON.stringify(src), version)),
    ).rejects.toThrow('opus35_canonical_json');
  }
  const descriptorText = fixture('descriptor.json').replace(
    '"videoId":',
    '"videoId":"https://private.invalid/synthetic","videoId":',
  );
  const descriptorBytes = new TextEncoder().encode(descriptorText),
    root = await sha256(descriptorBytes);
  await expect(parseVerifiedDescriptor(descriptorBytes, root)).rejects.toThrow(
    'opus35_canonical_json',
  );
  // Correct descriptor+source hashes on a full v6 envelope still hit canonical validation.
  const f = fixture('v6-fragment.txt'),
    o = JSON.parse(
      new TextDecoder().decode(
        await shareTransform(shareUnb64(f.slice(6)), false),
      ),
    );
  o.descriptor = shareB64(descriptorBytes);
  const r = JSON.parse(o.sourceRecord);
  r.audioDescriptorSha256 = root;
  o.sourceRecord = JSON.stringify(r);
  o.sourceRecordSha256 = await sha256(new TextEncoder().encode(o.sourceRecord));
  await expect(
    decodeOpus35Share(await encode(JSON.stringify(o), 'v=6')),
  ).rejects.toThrow('opus35_canonical_json');
  const config = JSON.parse(fixture('record.json')).config.replace(
    '"mono":',
    '"mono":"https://private.invalid/synthetic","mono":',
  );
  expect(() => parseOpus35Canonical(config)).toThrow('opus35_canonical_json');
  // R2 metadata length and outer source root remain valid, overwritten payload is inside metadata.
  const q = JSON.parse(
      new TextDecoder().decode(
        await shareTransform(shareUnb64(f.slice(6)), false),
      ),
    ),
    bytes = shareUnb64(q.replayR2);
  let p = 2,
    n = 0,
    shift = 0;
  for (;;) {
    const b = bytes[p++];
    n |= (b & 127) << shift;
    if (!(b & 128)) break;
    shift += 7;
  }
  const meta = new TextDecoder()
    .decode(bytes.subarray(p, p + n))
    .replace(
      '"speed":',
      '"speed":"https://private.invalid/synthetic","speed":',
    );
  const mb = new TextEncoder().encode(meta);
  let len = mb.length;
  const v: number[] = [];
  while (len >= 128) {
    v.push((len & 127) | 128);
    len >>>= 7;
  }
  v.push(len);
  q.replayR2 = shareB64(
    Uint8Array.from([82, 50, ...v, ...mb, ...bytes.subarray(p + n)]),
  );
  await expect(
    decodeOpus35Share(await encode(JSON.stringify(q), 'v=6')),
  ).rejects.toThrow('opus35_canonical_json');
});

import { inspectOpus35RawR2 } from '../src/opus/opus35-r2';
it('raw R2 rejects ninth header/nested extras and invalid UTF8 before unpack', async () => {
  const f = fs.readFileSync(
    new URL('../test-support/opus35-frost/v6-fragment.txt', import.meta.url),
    'utf8',
  );
  const e = JSON.parse(
    new TextDecoder().decode(
      await shareTransform(shareUnb64(f.slice(6)), false),
    ),
  );
  const bytes = shareUnb64(e.replayR2);
  let p = 2,
    n = 0,
    shift = 0;
  for (;;) {
    const b = bytes[p++];
    n |= (b & 127) << shift;
    if (!(b & 128)) break;
    shift += 7;
  }
  const meta = inspectOpus35RawR2(bytes);
  const encodeMeta = (mb: Uint8Array) => {
    let len = mb.length;
    const v: number[] = [];
    while (len >= 128) {
      v.push((len & 127) | 128);
      len >>>= 7;
    }
    v.push(len);
    return Uint8Array.from([82, 50, ...v, ...mb, ...bytes.subarray(p + n)]);
  };
  for (const kind of ['ninth', 'options', 'fever', 'utf8']) {
    const m = structuredClone(meta);
    if (kind === 'ninth') m.push('https://private.invalid/synthetic');
    if (kind === 'options') m[3].url = 'https://private.invalid/synthetic';
    if (kind === 'fever') m[7].url = 'https://private.invalid/synthetic';
    let mb = new TextEncoder().encode(JSON.stringify(m));
    if (kind === 'utf8') {
      mb = mb.slice();
      mb[2] = 255;
    }
    const mutated = encodeMeta(mb);
    expect(() => inspectOpus35RawR2(mutated), kind).toThrow();
    const q = { ...e, replayR2: shareB64(mutated) },
      fragment =
        'v=6&d=' +
        shareB64(
          await shareTransform(
            new TextEncoder().encode(JSON.stringify(q)),
            true,
          ),
        );
    await expect(decodeOpus35Share(fragment), kind).rejects.toThrow();
  }
});
