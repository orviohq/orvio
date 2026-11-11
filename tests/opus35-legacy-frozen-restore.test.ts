import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import FIXED from '../reference/public-manifest0914.json';
import {
  createLegacyFrozenRecordRestorer,
  fetchOpusDecoderExact,
} from '../src/opus/opus35-legacy-frozen-restore.mjs';
import { LEGACY_INVENTORY_ENTRIES } from '../src/opus/legacy-source-inventory.mjs';
import {
  LEGACY_CURRENTNESS_PROJECTION_KIND,
  LEGACY_CURRENTNESS_SOURCE_KIND,
} from '../src/opus/opus35-legacy-currentness-exchange.mjs';

const realRoot = new URL('../test-support/real3Ihr1016/', import.meta.url);
const legacyRoot = new URL('../test-support/legacy3Ihr/', import.meta.url);
const recordRaw = fs.readFileSync(new URL('base-record.raw.json', realRoot), 'utf8');
const record = JSON.parse(recordRaw);
const descriptorBytes = fs.readFileSync(new URL('descriptor.raw.json', realRoot));
const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
const descriptorSha256 = FIXED.descriptorSha256;
const encodedBytes = new Uint8Array(
  Buffer.concat([0, 1, 2, 3].map((i) => fs.readFileSync(new URL(`part${i}.bin`, legacyRoot)))),
);
const decoderWasm = fs.readFileSync(
  new URL('../src/opus-codec/opus-decoder.wasm', import.meta.url),
);
const epoch = '11111111-1111-4111-8111-111111111111';

const binding = {
  videoId: FIXED.videoId,
  encodedAudioSha256: FIXED.encodedAudioSha256,
  audioDescriptorSha256: FIXED.descriptorSha256,
  audioSha256: FIXED.pcm16Sha256,
  decoderWasmSha256: FIXED.decoderWasmSha256,
  frames: FIXED.frames,
};
const snap = (requestId: string, publicationEpoch = epoch) => ({
  version: 1,
  kind: LEGACY_CURRENTNESS_PROJECTION_KIND,
  requestId,
  ok: true,
  ...binding,
  sampleRate: 48000,
  channels: 2,
  sourceKind: LEGACY_CURRENTNESS_SOURCE_KIND,
  artifactRole: 'audio-only',
  chartEngineBinding: null,
  publicationEpoch,
  currentAtConfirmation: true,
});

function artifacts() {
  return {
    manifestId: FIXED.id,
    manifest: FIXED,
    descriptor,
    descriptorBytes,
    descriptorSha256,
    bytes: encodedBytes,
    encodedAudioSha256: FIXED.encodedAudioSha256,
  };
}

function harness(overrides: any = {}) {
  const prepareOwned =
    overrides.prepareOwned ??
    vi.fn(async () => ({
      record,
      pcm16: new ArrayBuffer(record.frames * 4),
      descriptor,
    }));
  const save = overrides.save ?? vi.fn();
  const fetchDecoder =
    overrides.fetchDecoder ?? vi.fn(async () => decoderWasm.slice().buffer);
  const exchangeCurrentness =
    overrides.exchangeCurrentness ?? vi.fn(async () => snap('a'.repeat(64)));
  const loadArtifacts =
    overrides.loadArtifacts ?? vi.fn(async () => artifacts());
  const restore = createLegacyFrozenRecordRestorer({
    loadArtifacts,
    prepareOwned,
    save,
    fetchDecoder,
    exchangeCurrentness,
    workerUrl: 'worker',
    decoderUrl: 'decoder',
  });
  return { restore, loadArtifacts, prepareOwned, save, fetchDecoder, exchangeCurrentness };
}

it('passes the exact frozen real3Ihr record and saves zero when epoch changes', async () => {
  let calls = 0;
  const exchangeCurrentness = vi.fn(async () =>
    snap(
      calls++ === 0 ? 'a'.repeat(64) : 'b'.repeat(64),
      calls === 1
        ? '11111111-1111-4111-8111-111111111111'
        : '22222222-2222-4222-8222-222222222222',
    ),
  );
  const h = harness({ exchangeCurrentness });
  await expect(
    h.restore({ record, signal: new AbortController().signal }),
  ).rejects.toThrow('legacy_sidecar_restore_currentness_changed');
  expect(h.exchangeCurrentness).toHaveBeenCalledTimes(2);
  expect(h.prepareOwned).toHaveBeenCalledOnce();
  expect(h.prepareOwned.mock.calls[0][0].frozenRecord).toEqual(record);
  expect(h.save).not.toHaveBeenCalled();
});

it('changed worker record fails frozen identity before save', async () => {
  const changed = { ...structuredClone(record), chartSetSha256: 'f'.repeat(64) };
  const h = harness({
    prepareOwned: vi.fn(async () => ({
      record: changed,
      pcm16: new ArrayBuffer(0),
      descriptor,
    })),
  });
  await expect(
    h.restore({ record, signal: new AbortController().signal }),
  ).rejects.toThrow('legacy_sidecar_restore_record_changed');
  expect(h.save).not.toHaveBeenCalled();
});

it('denial before decode saves zero and never reaches the worker', async () => {
  const h = harness({
    exchangeCurrentness: vi.fn(async () => ({
      version: 1,
      kind: LEGACY_CURRENTNESS_PROJECTION_KIND,
      requestId: 'd'.repeat(64),
      ok: false,
      error: 'published_legacy_audio_unavailable',
    })),
  });
  await expect(
    h.restore({ record, signal: new AbortController().signal }),
  ).rejects.toThrow('legacy_sidecar_restore_currentness_denied');
  expect(h.prepareOwned).not.toHaveBeenCalled();
  expect(h.fetchDecoder).not.toHaveBeenCalled();
  expect(h.save).not.toHaveBeenCalled();
});

it('abort at the immediate pre-save recheck saves zero', async () => {
  const c = new AbortController();
  let calls = 0;
  const h = harness({
    exchangeCurrentness: vi.fn(async () => {
      if (calls++ === 0) return snap('a'.repeat(64));
      c.abort(Error('pre-save stop'));
      throw c.signal.reason;
    }),
  });
  await expect(h.restore({ record, signal: c.signal })).rejects.toThrow(
    'pre-save stop',
  );
  expect(h.prepareOwned).toHaveBeenCalledOnce();
  expect(h.save).not.toHaveBeenCalled();
});

it('unregistered valid record fails closed before currentness, decode and save', async () => {
  const frostRecord = JSON.parse(
    fs.readFileSync(
      new URL('../test-support/opus35-frost/record.json', import.meta.url),
      'utf8',
    ),
  );
  const h = harness();
  await expect(
    h.restore({ record: frostRecord, signal: new AbortController().signal }),
  ).rejects.toThrow('legacy_sidecar_restore_source_not_registered');
  expect(h.exchangeCurrentness).not.toHaveBeenCalled();
  expect(h.prepareOwned).not.toHaveBeenCalled();
  expect(h.save).not.toHaveBeenCalled();
});

it('declared oversized decoder length is rejected before any reader is created', async () => {
  let readers = 0,
    cancelled = 0;
  const body = {
    cancel() {
      cancelled++;
      return new Promise(() => {});
    },
    getReader() {
      readers++;
      throw Error('reader must not be created');
    },
  };
  const response = {
    ok: true,
    body,
    headers: new Headers({ 'Content-Length': '93686' }),
  };
  await expect(
    fetchOpusDecoderExact({
      decoderUrl: 'decoder',
      signal: new AbortController().signal,
      fetchImpl: async () => response as any,
    }),
  ).rejects.toThrow('legacy_sidecar_restore_decoder_size');
  expect(readers).toBe(0);
  expect(cancelled).toBe(1);
});

it('decoder read abort is bounded and detached from cancel', async () => {
  const c = new AbortController();
  let cancelled = 0;
  const response = {
    ok: true,
    headers: new Headers(),
    body: {
      getReader() {
        return {
          read() {
            return new Promise(() => {});
          },
          cancel() {
            cancelled++;
            return new Promise(() => {});
          },
          releaseLock() {},
        };
      },
    },
  };
  const pending = fetchOpusDecoderExact({
    decoderUrl: 'decoder',
    signal: c.signal,
    fetchImpl: async () => response as any,
  });
  setTimeout(() => c.abort(Error('decoder stop')), 10);
  const result = await Promise.race([
    pending.then(
      () => Error('resolved'),
      (e: any) => e,
    ),
    new Promise((_, reject) =>
      setTimeout(() => reject(Error('hung')), 500),
    ),
  ]);
  expect(result).toBeInstanceOf(Error);
  expect(result.message).toBe('decoder stop');
  expect(cancelled).toBe(1);
});


const nonfirstRecord = JSON.parse(
  fs.readFileSync(
    new URL('../test-support/realNonfirst1016/base-record.raw.json', import.meta.url),
    'utf8',
  ),
);

it('actual nonfirst frozen record derives its manifestId before the loader', async () => {
  const loadArtifacts = vi.fn(async () => {
    throw Error('loader sentinel');
  });
  const h = harness({ loadArtifacts });
  await expect(
    h.restore({ record: nonfirstRecord, signal: new AbortController().signal }),
  ).rejects.toThrow('loader sentinel');
  expect(loadArtifacts).toHaveBeenCalledWith({
    manifestId: LEGACY_INVENTORY_ENTRIES[1].manifestId,
    signal: expect.any(AbortSignal),
  });
});

it('unknown roots and mismatched caller manifestId perform zero loader/network work', async () => {
  const unknown = harness({
    loadArtifacts: vi.fn(async () => {
      throw Error('must not load');
    }),
  });
  await expect(
    unknown.restore({
      record: fs.existsSync(new URL('../test-support/opus35-frost/record.json', import.meta.url))
        ? JSON.parse(
            fs.readFileSync(
              new URL('../test-support/opus35-frost/record.json', import.meta.url),
              'utf8',
            ),
          )
        : {},
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('legacy_sidecar_restore_source_not_registered');
  expect(unknown.loadArtifacts).not.toHaveBeenCalled();

  const load = vi.fn(async () => {
    throw Error('must not load');
  });
  const mismatch = harness({ loadArtifacts: load });
  await expect(
    mismatch.restore({
      record: nonfirstRecord,
      manifestId: LEGACY_INVENTORY_ENTRIES[18].manifestId,
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('legacy_sidecar_restore_manifest_mismatch');
  expect(load).not.toHaveBeenCalled();
});
