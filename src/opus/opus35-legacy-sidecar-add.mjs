// Explicit Add composition for a NEW Opus base from reviewed fixed sidecar bytes.
// Loads and verifies fixed transport, then the owned worker generates NEW
// commoncore35 charts. No old WAV chartSet, old replay record or share/v7 path.
import {
  FIXED_LEGACY_SIDECAR_ID,
  loadLegacySidecarArtifacts,
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

const DECODER_BYTES = 93685;
const fail = (code) => {
  throw Error('legacy_sidecar_add_' + code);
};

function cancelBody(body) {
  try {
    Promise.resolve(body?.cancel()).catch(() => {});
  } catch {}
}

function waitForSignal(promise, signal) {
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
        if (settled) return;
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

async function readDecoderExact(response, signal) {
  if (!response.ok || !response.body) {
    cancelBody(response.body);
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
      if (
        !(value instanceof Uint8Array) ||
        offset + value.length > DECODER_BYTES
      )
        fail('decoder_size');
      out.set(value, offset);
      offset += value.length;
    }
  } finally {
    release();
  }
  signal?.throwIfAborted();
  if (offset !== DECODER_BYTES) fail('decoder_size');
  return out.buffer;
}

async function defaultFetchDecoder({ decoderUrl, signal }) {
  const response = await fetch(decoderUrl, { signal, redirect: 'error' });
  return readDecoderExact(response, signal);
}

function requireFunction(value, code) {
  if (typeof value !== 'function') fail(code);
  return value;
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

function sameCurrentness(a, b) {
  return (
    a.ok === true &&
    b.ok === true &&
    a.kind === LEGACY_CURRENTNESS_PROJECTION_KIND &&
    a.sourceKind === LEGACY_CURRENTNESS_SOURCE_KIND &&
    SNAPSHOT_FIELDS.every((k) => a[k] === b[k])
  );
}

/** Build-owned composition seam. Tests may inject owned equivalents, but the
 * default wiring always uses the actual transport, worker client and cache.
 * `exchangeCurrentness` is mandatory: an unwired Add fails closed. */
export function createLegacySidecarBaseAdder({
  loadArtifacts = loadLegacySidecarArtifacts,
  prepareOwned = prepareOpusOwned,
  save = saveVerifiedOpus,
  fetchDecoder = defaultFetchDecoder,
  exchangeCurrentness,
  workerUrl,
  decoderUrl,
} = {}) {
  requireFunction(loadArtifacts, 'loader');
  requireFunction(prepareOwned, 'worker');
  requireFunction(save, 'cache');
  requireFunction(fetchDecoder, 'decoder');
  requireFunction(exchangeCurrentness, 'currentness');
  return async function addLegacySidecarBase({
    manifestId = FIXED_LEGACY_SIDECAR_ID,
    signal,
  } = {}) {
    if (!(signal instanceof AbortSignal)) fail('signal');
    signal.throwIfAborted();
    const artifacts = await loadArtifacts({ manifestId, signal });
    signal.throwIfAborted();
    const binding = currentnessBinding(artifacts);

    // Acquire owner currentness before admitting generated audio.
    const before = await exchangeCurrentness(binding, { signal });
    signal.throwIfAborted();
    if (!before || before.ok !== true) fail('currentness_denied');

    const wasm = await fetchDecoder({ decoderUrl, signal });
    signal.throwIfAborted();
    if (!(wasm instanceof ArrayBuffer)) fail('decoder');
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
    });
    signal.throwIfAborted();
    if (
      !decoded ||
      !decoded.record ||
      !(decoded.pcm16 instanceof ArrayBuffer) ||
      !decoded.descriptor
    )
      fail('worker_result');
    if (
      decoded.record.audioDescriptorSha256 !== artifacts.descriptorSha256 ||
      decoded.record.encodedAudioSha256 !== artifacts.encodedAudioSha256 ||
      !(await verifyOpusRecord(
        decoded.record,
        decoded.descriptor,
        artifacts.descriptorSha256,
      ))
    )
      fail('record_binding');
    signal.throwIfAborted();

    // Fresh immediate pre-save recheck under the same signal and binding.
    const after = await exchangeCurrentness(binding, { signal });
    signal.throwIfAborted();
    if (!after || after.ok !== true) fail('currentness_denied');
    if (!sameCurrentness(before, after)) fail('currentness_changed');
    signal.throwIfAborted();

    await save({ ...artifacts, record: decoded.record }, signal);
    signal.throwIfAborted();
    return {
      kind: 'orvio-opus-v1',
      manifestId: artifacts.manifestId,
      record: decoded.record,
      pcm16: decoded.pcm16,
      descriptor: decoded.descriptor,
      descriptorBytes: artifacts.descriptorBytes,
      descriptorSha256: artifacts.descriptorSha256,
      encodedAudioSha256: artifacts.encodedAudioSha256,
      currentnessEpoch: after.publicationEpoch,
      restored: false,
    };
  };
}

/** Build-owned wrapper. The currentness endpoint is an explicit build input;
 * there is deliberately no public/default legacy projection route. */
export async function createBuildOwnedLegacySidecarAdder({
  currentnessEndpoint,
  fetchImpl,
} = {}) {
  const exchangeCurrentness = createLegacyCurrentnessExchange({
    endpoint: currentnessEndpoint,
    ...(fetchImpl ? { fetchImpl } : {}),
  }).exchange;
  const [{ default: workerUrl }, { default: decoderUrl }] = await Promise.all([
    import('./opus-chart.worker.mjs?worker&url'),
    import('../opus-codec/opus-decoder.wasm?url'),
  ]);
  return createLegacySidecarBaseAdder({
    exchangeCurrentness,
    workerUrl,
    decoderUrl,
  });
}
