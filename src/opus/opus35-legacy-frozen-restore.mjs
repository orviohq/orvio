import {
  loadLegacySidecarArtifacts,
  LEGACY_SIDECAR_MANIFEST_MAX,
} from './opus35-legacy-sidecar.mjs';
import {
  createLegacyCurrentnessExchange,
  LEGACY_CURRENTNESS_PROJECTION_KIND,
  LEGACY_CURRENTNESS_SOURCE_KIND,
} from './opus35-legacy-currentness-exchange.mjs';
import { DECODER, sha256 } from './opus-descriptor.mjs';
import { prepareOpusOwned } from './opus-chart-worker-client.mjs';
import { saveVerifiedOpus } from './opus-cache.mjs';
import { verifyOpusRecord } from './opus-record.ts';
import {
  findLegacySourceRoots,
  resolveVerifiedLegacySource,
} from './unified/legacy-source-registry.mjs';

const DECODER_BYTES = 93685;
const RECORD_MAX = 1572864;
const fail = (code) => {
  throw Error('legacy_sidecar_restore_' + code);
};

const SNAPSHOT_FIELDS = [
  'version',
  'kind',
  'videoId',
  'encodedAudioSha256',
  'audioDescriptorSha256',
  'audioSha256',
  'decoderWasmSha256',
  'frames',
  'sampleRate',
  'channels',
  'sourceKind',
  'artifactRole',
  'chartEngineBinding',
  'publicationEpoch',
  'currentAtConfirmation',
];

function cancelBody(body) {
  try {
    Promise.resolve(body?.cancel()).catch(() => {});
  } catch {}
}

function waitForSignal(promise, signal, onLate) {
  if (!signal) return Promise.resolve(promise);
  return new Promise((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        if (settled) {
          try {
            onLate?.(value);
          } catch {}
          return;
        }
        settled = true;
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}

function sameCurrentness(a, b) {
  return (
    a.ok === true &&
    b.ok === true &&
    a.kind === LEGACY_CURRENTNESS_PROJECTION_KIND &&
    a.sourceKind === LEGACY_CURRENTNESS_SOURCE_KIND &&
    SNAPSHOT_FIELDS.every((k) => a[k] === b[k])
  );
}

function currentnessBinding(artifacts) {
  const m = artifacts?.manifest;
  if (
    !m ||
    typeof m.videoId !== 'string' ||
    typeof m.encodedAudioSha256 !== 'string' ||
    typeof m.descriptorSha256 !== 'string' ||
    typeof m.pcm16Sha256 !== 'string' ||
    typeof m.decoderWasmSha256 !== 'string' ||
    !Number.isSafeInteger(m.frames)
  )
    fail('currentness_binding');
  return Object.freeze({
    videoId: m.videoId,
    encodedAudioSha256: m.encodedAudioSha256,
    audioDescriptorSha256: m.descriptorSha256,
    audioSha256: m.pcm16Sha256,
    decoderWasmSha256: m.decoderWasmSha256,
    frames: m.frames,
  });
}

export async function fetchOpusDecoderExact({
  decoderUrl,
  signal,
  fetchImpl = globalThis.fetch,
} = {}) {
  signal?.throwIfAborted();
  if (typeof fetchImpl !== 'function') fail('decoder_fetch');
  const response = await waitForSignal(
    fetchImpl(decoderUrl, { signal, redirect: 'error' }),
    signal,
    (r) => cancelBody(r?.body),
  );
  if (signal?.aborted) {
    cancelBody(response?.body);
    signal.throwIfAborted();
  }
  if (!response?.ok || !response.body) {
    cancelBody(response?.body);
    fail('decoder_unavailable');
  }
  const header = response.headers.get('Content-Length'),
    declared = Number(header);
  if (
    (header !== null &&
      (!/^\d+$/.test(header) ||
        !Number.isSafeInteger(declared) ||
        declared < 1 ||
        declared > DECODER_BYTES)) ||
    !response.body
  ) {
    cancelBody(response.body);
    fail('decoder_size');
  }
  const out = new Uint8Array(DECODER_BYTES),
    reader = response.body.getReader();
  let offset = 0;
  const release = () => {
    try {
      Promise.resolve(reader.cancel()).catch(() => {});
    } catch {}
    try {
      reader.releaseLock();
    } catch {}
  };
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await waitForSignal(reader.read(), signal);
      signal?.throwIfAborted();
      if (done) break;
      if (!(value instanceof Uint8Array) || offset + value.length > DECODER_BYTES)
        fail('decoder_size');
      out.set(value, offset);
      offset += value.length;
    }
  } finally {
    release();
  }
  signal?.throwIfAborted();
  if (offset !== DECODER_BYTES) fail('decoder_size');
  if ((await sha256(out)) !== DECODER) fail('decoder_identity');
  return out.buffer;
}

function requireFunction(value, code) {
  if (typeof value !== 'function') fail(code);
  return value;
}

export function createLegacyFrozenRecordRestorer({
  loadArtifacts = loadLegacySidecarArtifacts,
  prepareOwned = prepareOpusOwned,
  save = saveVerifiedOpus,
  fetchDecoder = fetchOpusDecoderExact,
  exchangeCurrentness,
  workerUrl,
  decoderUrl,
} = {}) {
  requireFunction(loadArtifacts, 'loader');
  requireFunction(prepareOwned, 'worker');
  requireFunction(save, 'cache');
  requireFunction(fetchDecoder, 'decoder');
  requireFunction(exchangeCurrentness, 'currentness');
  return async function restoreLegacyFrozenRecord({ record, manifestId, signal } = {}) {
    if (!(signal instanceof AbortSignal)) fail('signal');
    signal.throwIfAborted();
    if (!record || typeof record !== 'object' || Array.isArray(record))
      fail('record');
    const storedRecord = structuredClone(record),
      storedRaw = JSON.stringify(storedRecord);
    if (new TextEncoder().encode(storedRaw).length > RECORD_MAX)
      fail('record_bytes');
    signal.throwIfAborted();
    const derived = findLegacySourceRoots({
      videoId: storedRecord.videoId,
      encodedAudioSha256: storedRecord.encodedAudioSha256,
      audioDescriptorSha256: storedRecord.audioDescriptorSha256,
      audioSha256: storedRecord.audioSha256,
      decoderWasmSha256: storedRecord.decoderWasmSha256,
      frames: storedRecord.frames,
      sampleRate: storedRecord.sampleRate,
      channels: 2,
    });
    if (!derived) fail('source_not_registered');
    if (manifestId !== undefined && manifestId !== derived.manifestId)
      fail('manifest_mismatch');
    if (!(await verifyOpusRecord(storedRecord))) fail('record_binding');
    signal.throwIfAborted();

    const artifacts = await loadArtifacts({
      manifestId: derived.manifestId,
      signal,
    });
    signal.throwIfAborted();
    if (
      !(artifacts?.descriptorBytes instanceof Uint8Array) ||
      !(artifacts?.bytes instanceof Uint8Array) ||
      typeof artifacts?.descriptorSha256 !== 'string' ||
      artifacts.descriptorBytes.length > LEGACY_SIDECAR_MANIFEST_MAX
    )
      fail('artifacts');
    const registered = await resolveVerifiedLegacySource({
      descriptorBytes: artifacts.descriptorBytes,
      baseRecord: storedRecord,
      signal,
    });
    if (
      !registered ||
      registered.manifestId !== derived.manifestId ||
      artifacts.manifestId !== derived.manifestId ||
      artifacts.manifest?.id !== derived.manifestId
    )
      fail('source_manifest_binding');
    signal?.throwIfAborted();

    const binding = currentnessBinding(artifacts);
    const before = await exchangeCurrentness(binding, { signal });
    signal.throwIfAborted();
    if (!before || before.ok !== true) fail('currentness_denied');

    const wasm = await fetchDecoder({ decoderUrl, signal });
    signal.throwIfAborted();
    if (!(wasm instanceof ArrayBuffer) || wasm.byteLength !== DECODER_BYTES)
      fail('decoder');
    if ((await sha256(new Uint8Array(wasm))) !== DECODER)
      fail('decoder_identity');
    signal.throwIfAborted();

    const decoded = await prepareOwned({
      workerUrl,
      bytes: artifacts.bytes.slice().buffer,
      wasmBytes: wasm,
      descriptorBytes: artifacts.descriptorBytes.slice().buffer,
      descriptorSha256: artifacts.descriptorSha256,
      signal,
      frozenRecord: storedRecord,
    });
    signal.throwIfAborted();
    if (
      !decoded ||
      !decoded.record ||
      !(decoded.pcm16 instanceof ArrayBuffer) ||
      !decoded.descriptor
    )
      fail('worker_result');
    if (JSON.stringify(decoded.record) !== storedRaw) fail('record_changed');
    if (!(await verifyOpusRecord(decoded.record, decoded.descriptor, artifacts.descriptorSha256)))
      fail('record_binding');
    if (
      decoded.record.audioDescriptorSha256 !== artifacts.descriptorSha256 ||
      decoded.record.encodedAudioSha256 !== artifacts.encodedAudioSha256 ||
      decoded.pcm16.byteLength !== storedRecord.frames * 4
    )
      fail('record_binding');
    signal.throwIfAborted();

    const after = await exchangeCurrentness(binding, { signal });
    signal.throwIfAborted();
    if (!after || after.ok !== true) fail('currentness_denied');
    if (!sameCurrentness(before, after)) fail('currentness_changed');
    signal.throwIfAborted();

    await save({ ...artifacts, record: storedRecord }, signal);
    signal.throwIfAborted();
    return decoded.pcm16;
  };
}

export async function createBuildOwnedLegacyFrozenRecordRestorer({
  currentnessEndpoint,
  fetchImpl = globalThis.fetch,
} = {}) {
  const exchangeCurrentness = createLegacyCurrentnessExchange({
    endpoint: currentnessEndpoint,
    fetchImpl,
  }).exchange;
  const [{ default: workerUrl }, { default: decoderUrl }] = await Promise.all([
    import('./opus-chart.worker.mjs?worker&url'),
    import('../opus-codec/opus-decoder.wasm?url'),
  ]);
  return createLegacyFrozenRecordRestorer({
    exchangeCurrentness,
    workerUrl,
    decoderUrl,
    fetchDecoder: ({ decoderUrl, signal }) =>
      fetchOpusDecoderExact({ decoderUrl, signal, fetchImpl }),
  });
}
