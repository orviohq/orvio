import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createProduction468SplitProjectionReader } from '../src/opus/unified/split-projection-reader.mjs';
import { createProductionLegacySplitProjectionReader } from '../src/opus/unified/legacy-split-projection-reader.mjs';
import { createOpus468AdaptiveDerivedVerifier } from '../src/opus/opus468-adaptive-derived-adapter.mjs';

const descriptorBytes = fs.readFileSync(
  new URL('../test-support/opus35-frost/descriptor.json', import.meta.url),
);
const descriptor = JSON.parse(descriptorBytes.toString('utf8'));
const recordRaw = fs.readFileSync(
  new URL('../test-support/opus35-frost/record.json', import.meta.url),
  'utf8',
);
const record = JSON.parse(recordRaw);
const descriptorSha256 = createHash('sha256')
  .update(descriptorBytes)
  .digest('hex');
const hashText = (s: string) =>
  createHash('sha256').update(s, 'utf8').digest('hex');

const GEN = 'legacy-parity-generator-v1';
const PRODUCER = 'a'.repeat(64);
const RECIPE = 'b'.repeat(64);
const CORPUS = 'c'.repeat(64);
const POLICY = {
  generatorVersion: GEN,
  producerSha256: PRODUCER,
  recipeSha256: RECIPE,
  corpusSha256: CORPUS,
};
const LOADED = { producerSha256: PRODUCER, recipeSha256: RECIPE };
const KEYS = [4, 6, 8].flatMap((n) =>
  ['low', 'mid', 'high', 'sc'].map((t) => `${n}:${t}`),
);
const FAMILY: Record<string, string> = {
  low: 'NM',
  mid: 'HD',
  high: 'MX',
  sc: 'SC',
};

function makeExtension({ collapseFourSc = false } = {}) {
  const charts: any = {},
    chartMeta: any = {};
  for (let i = 0; i < KEYS.length; i++) {
    const key = KEYS[i],
      tier = key.slice(2);
    if (collapseFourSc && key === '4:sc') {
      charts[key] = { unavailable: 'sc_collapsed_into_mx' };
      chartMeta[key] = { family: 'SC', rating: null, scAvailable: false };
      continue;
    }
    const notes = [{ id: 0, time: 0.01 + i * 0.01, lane: 0 }];
    charts[key] = { notes, sha256: hashText(JSON.stringify(notes)) };
    chartMeta[key] = {
      family: FAMILY[tier],
      rating: { scale: tier === 'sc' ? 'sc' : 'standard', level: 1 },
      scAvailable: true,
    };
  }
  const extension: any = {
    kind: 'orvio-opus-chart-extension-v1',
    version: 1,
    family: '468-v1',
    videoId: descriptor.videoId,
    baseSourceRecordSha256: hashText(recordRaw),
    baseChartSetSha256: record.chartSetSha256,
    audioSha256: descriptor.pcm16Sha256,
    audioDescriptorSha256: descriptorSha256,
    encodedAudioSha256: descriptor.oggSha256,
    decoderWasmSha256: descriptor.decoderWasmSha256,
    pipelineVersion: record.pipelineVersion,
    frames: descriptor.frames,
    sampleRate: descriptor.sampleRate,
    channels: descriptor.channels,
    generatorVersion: GEN,
    config: record.config,
    charts,
    chartMeta,
  };
  extension.extensionSha256 = hashText(JSON.stringify(extension));
  return extension;
}

const extension = makeExtension();
const request = {
  version: 1,
  videoId: record.videoId,
  encodedAudioSha256: record.encodedAudioSha256,
  baseSourceRecordJson: recordRaw,
  extension,
};
const selection = { lanes: 4, difficulty: 'low' };

function makeReaders(verifyDerivedRecord: any) {
  const exchangeProjection = vi.fn(async () => {
    throw Error('canonical_exchange_must_not_run');
  });
  const exchangeCurrentness = vi.fn(async () => {
    throw Error('legacy_exchange_must_not_run');
  });
  const consumerOptions = {
    policyRows: [POLICY],
    loadedProducerIdentity: LOADED,
    verifyDerivedRecord,
  };
  return {
    canonical: createProduction468SplitProjectionReader({
      consumerOptions,
      exchangeProjection,
    }),
    legacy: createProductionLegacySplitProjectionReader({
      consumerOptions,
      exchangeCurrentness,
    }),
    exchangeProjection,
    exchangeCurrentness,
  };
}

async function expectParity(
  input: any,
  chosen: any,
  code: string,
  verifyDerivedRecord = vi.fn(async () => false),
) {
  const readers = makeReaders(verifyDerivedRecord);
  await expect(
    readers.canonical.readChart(input, descriptorBytes, chosen),
  ).rejects.toThrow(code);
  await expect(
    readers.legacy.readChart(input, descriptorBytes, chosen),
  ).rejects.toThrow(code);
  expect(readers.exchangeProjection).not.toHaveBeenCalled();
  expect(readers.exchangeCurrentness).not.toHaveBeenCalled();
}

it('canonical and legacy readers share request and request-binding gates', async () => {
  await expectParity({ ...request, extra: true }, selection, 'fresh_request');
  await expectParity({ ...request, version: 2 }, selection, 'fresh_request');
  await expectParity(request, { lanes: 5, difficulty: 'low' }, 'fresh_request');
  await expectParity(
    { ...request, extension: { ...extension, videoId: 'AAAAAAAAAAA' } },
    selection,
    'fresh_request_binding',
  );
});

it('canonical and legacy readers share policy and local-root gates', async () => {
  await expectParity(
    {
      ...request,
      extension: {
        ...extension,
        generatorVersion: 'unregistered-generator-v1',
      },
    },
    selection,
    'fresh_generator_unqualified',
  );
  await expectParity(
    {
      ...request,
      extension: { ...extension, audioSha256: 'f'.repeat(64) },
    },
    selection,
    'projection_local_roots',
  );
});

it('canonical and legacy readers share local-binding and slot gates', async () => {
  const missing = structuredClone(extension);
  delete missing.charts['8:sc'];
  await expectParity(
    { ...request, extension: missing },
    selection,
    'production_local_binding_extension_slots',
  );
  await expectParity(
    {
      ...request,
      extension: { ...extension, extensionSha256: 'f'.repeat(64) },
    },
    selection,
    'production_local_binding_extension_hash',
  );
});

it('canonical and legacy readers share playable selection gate', async () => {
  await expectParity(
    { ...request, extension: makeExtension({ collapseFourSc: true }) },
    { lanes: 4, difficulty: 'sc' },
    'production_playable_keys',
  );
});

it('canonical and legacy readers share the derived gate before any exchange', async () => {
  await expectParity(request, selection, 'fresh_derived_record');
});

it('an unregistered source fails the legacy registry gate before exchange while canonical reaches its own exchange', async () => {
  const readers = makeReaders(vi.fn(async () => true));
  await expect(
    readers.canonical.readChart(request, descriptorBytes, selection),
  ).rejects.toThrow('canonical_exchange_must_not_run');
  expect(readers.exchangeProjection).toHaveBeenCalledOnce();
  await expect(
    readers.legacy.readChart(request, descriptorBytes, selection),
  ).rejects.toThrow('legacy_source_registry_binding');
  expect(readers.exchangeCurrentness).not.toHaveBeenCalled();
});

function adaptiveFixture() {
  const audioBytes = new Uint8Array(
      fs.readFileSync(
        new URL('../test-support/opus35-frost/audio.ogg', import.meta.url),
      ),
    ),
    wasmBytes = new Uint8Array(
      fs.readFileSync(
        new URL('../src/opus-codec/opus-decoder.wasm', import.meta.url),
      ),
    ),
    resolveArtifacts = vi.fn(async () => ({
      audioBytes: audioBytes.slice(),
      descriptorBytes: new Uint8Array(descriptorBytes),
      decoderWasmBytes: wasmBytes.slice(),
    })),
    verifyInWorker = vi.fn(async () => ({
      ok: true,
      steps: {
        regeneration: {
          level: 2,
          extensionSha256Match: true,
          canonicalRecordMatch: true,
        },
      },
    })),
    context = {
      baseRecordRaw: recordRaw,
      baseRecord: record,
      descriptor,
      descriptorSha256,
    };
  return {
    resolveArtifacts,
    verifyInWorker,
    context,
    extension,
  };
}

it('reuses only the worker verdict for exact inputs within one signal operation', async () => {
  const f = adaptiveFixture(),
    signal = new AbortController().signal,
    verify = createOpus468AdaptiveDerivedVerifier({
      resolveArtifacts: f.resolveArtifacts,
      verifyInWorker: f.verifyInWorker,
      operationWorkerReuse: true,
    });
  expect(await verify(f.extension, { ...f.context, signal })).toBe(true);
  expect(await verify(f.extension, { ...f.context, signal })).toBe(true);
  expect(f.resolveArtifacts).toHaveBeenCalledTimes(2);
  expect(f.verifyInWorker).toHaveBeenCalledOnce();
});

it('does not reuse without a signal or across signals, and failed verdicts are not cached', async () => {
  const f = adaptiveFixture(),
    verify = createOpus468AdaptiveDerivedVerifier({
      resolveArtifacts: f.resolveArtifacts,
      verifyInWorker: f.verifyInWorker,
      operationWorkerReuse: true,
    });
  await verify(f.extension, f.context);
  await verify(f.extension, f.context);
  const first = new AbortController(),
    second = new AbortController();
  await verify(f.extension, { ...f.context, signal: first.signal });
  await verify(f.extension, { ...f.context, signal: second.signal });
  expect(f.verifyInWorker).toHaveBeenCalledTimes(4);

  const failed = adaptiveFixture();
  failed.verifyInWorker
    .mockResolvedValueOnce({
      ok: false,
      steps: {
        regeneration: {
          level: 0,
          extensionSha256Match: false,
          canonicalRecordMatch: false,
        },
      },
    })
    .mockResolvedValueOnce({
      ok: true,
      steps: {
        regeneration: {
          level: 2,
          extensionSha256Match: true,
          canonicalRecordMatch: true,
        },
      },
    });
  const retry = createOpus468AdaptiveDerivedVerifier({
    resolveArtifacts: failed.resolveArtifacts,
    verifyInWorker: failed.verifyInWorker,
    operationWorkerReuse: true,
  });
  const signal = new AbortController().signal;
  expect(await retry(failed.extension, { ...failed.context, signal })).toBe(
    false,
  );
  expect(await retry(failed.extension, { ...failed.context, signal })).toBe(
    true,
  );
  expect(failed.verifyInWorker).toHaveBeenCalledTimes(2);

  const rejected = adaptiveFixture();
  rejected.verifyInWorker
    .mockRejectedValueOnce(Error('worker_rejected'))
    .mockResolvedValueOnce({
      ok: true,
      steps: {
        regeneration: {
          level: 2,
          extensionSha256Match: true,
          canonicalRecordMatch: true,
        },
      },
    });
  const rejectedVerify = createOpus468AdaptiveDerivedVerifier({
    resolveArtifacts: rejected.resolveArtifacts,
    verifyInWorker: rejected.verifyInWorker,
    operationWorkerReuse: true,
  });
  const rejectedSignal = new AbortController().signal;
  await expect(
    rejectedVerify(rejected.extension, {
      ...rejected.context,
      signal: rejectedSignal,
    }),
  ).rejects.toThrow('worker_rejected');
  expect(
    await rejectedVerify(rejected.extension, {
      ...rejected.context,
      signal: rejectedSignal,
    }),
  ).toBe(true);
  expect(rejected.verifyInWorker).toHaveBeenCalledTimes(2);
});

it('keeps the default disabled, rechecks corrupted artifacts, and clears late aborts', async () => {
  const f = adaptiveFixture(),
    verify = createOpus468AdaptiveDerivedVerifier({
      resolveArtifacts: f.resolveArtifacts,
      verifyInWorker: f.verifyInWorker,
      operationWorkerReuse: true,
    });
  const signal = new AbortController().signal;
  expect(await verify(f.extension, { ...f.context, signal })).toBe(true);
  f.resolveArtifacts.mockResolvedValueOnce({
    audioBytes: new Uint8Array([0]),
    descriptorBytes: new Uint8Array(descriptorBytes),
    decoderWasmBytes: new Uint8Array(
      fs.readFileSync(
        new URL('../src/opus-codec/opus-decoder.wasm', import.meta.url),
      ),
    ),
  });
  expect(await verify(f.extension, { ...f.context, signal })).toBe(false);
  expect(await verify(f.extension, { ...f.context, signal })).toBe(true);
  expect(f.verifyInWorker).toHaveBeenCalledOnce();

  f.resolveArtifacts.mockResolvedValueOnce({
    audioBytes: new Uint8Array(
      fs.readFileSync(
        new URL('../test-support/opus35-frost/audio.ogg', import.meta.url),
      ),
    ),
    descriptorBytes: new Uint8Array([0]),
    decoderWasmBytes: new Uint8Array(
      fs.readFileSync(
        new URL('../src/opus-codec/opus-decoder.wasm', import.meta.url),
      ),
    ),
  });
  expect(await verify(f.extension, { ...f.context, signal })).toBe(false);
  expect(await verify(f.extension, { ...f.context, signal })).toBe(true);

  f.resolveArtifacts.mockResolvedValueOnce({
    audioBytes: new Uint8Array(
      fs.readFileSync(
        new URL('../test-support/opus35-frost/audio.ogg', import.meta.url),
      ),
    ),
    descriptorBytes: new Uint8Array(descriptorBytes),
    decoderWasmBytes: new Uint8Array([0]),
  });
  expect(await verify(f.extension, { ...f.context, signal })).toBe(false);
  expect(await verify(f.extension, { ...f.context, signal })).toBe(true);
  expect(f.verifyInWorker).toHaveBeenCalledOnce();

  expect(
    await verify(
      { ...f.extension, audioSha256: 'f'.repeat(64) },
      { ...f.context, signal },
    ),
  ).toBe(false);
  expect(
    await verify(f.extension, {
      ...f.context,
      baseRecordRaw: recordRaw + ' ',
      signal,
    }),
  ).toBe(false);
  expect(
    await verify(f.extension, {
      ...f.context,
      descriptor: { ...descriptor, videoId: 'changed' },
      signal,
    }),
  ).toBe(false);

  const defaultFixture = adaptiveFixture(),
    defaultVerify = createOpus468AdaptiveDerivedVerifier({
      resolveArtifacts: defaultFixture.resolveArtifacts,
      verifyInWorker: defaultFixture.verifyInWorker,
    }),
    defaultSignal = new AbortController().signal;
  await defaultVerify(defaultFixture.extension, {
    ...defaultFixture.context,
    signal: defaultSignal,
  });
  await defaultVerify(defaultFixture.extension, {
    ...defaultFixture.context,
    signal: defaultSignal,
  });
  expect(defaultFixture.verifyInWorker).toHaveBeenCalledTimes(2);

  const lateController = new AbortController();
  let release!: (value: any) => void;
  f.verifyInWorker.mockImplementationOnce(
    () => new Promise((done) => (release = done)),
  );
  const pending = verify(f.extension, {
    ...f.context,
    signal: lateController.signal,
  });
  await vi.waitFor(() => expect(f.verifyInWorker).toHaveBeenCalledTimes(2));
  lateController.abort();
  release({
    ok: true,
    steps: {
      regeneration: {
        level: 2,
        extensionSha256Match: true,
        canonicalRecordMatch: true,
      },
    },
  });
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  const next = new AbortController();
  expect(await verify(f.extension, { ...f.context, signal: next.signal })).toBe(
    true,
  );
  expect(f.verifyInWorker).toHaveBeenCalledTimes(3);
});
