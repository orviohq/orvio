// Separate legacy-sidecar currentness exchange.
// Build-owned endpoint is required: there is no production default route here.
// One POST per call, fresh cryptographic nonce every call, exact reviewed
// projection or exact legacy denial. Never a canonical projection/fallback.
export const LEGACY_CURRENTNESS_PROJECTION_KIND =
  'orvio-published-legacy-audio-projection-v1';
export const LEGACY_CURRENTNESS_SOURCE_KIND = 'published-legacy-sidecar';
export const LEGACY_CURRENTNESS_DENIAL = 'published_legacy_audio_unavailable';

const MAX_RESPONSE = 2048;
const H = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const V = (x) => typeof x === 'string' && /^[A-Za-z0-9_-]{11}$/.test(x);
const U = (x) =>
  typeof x === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
const exact = (o, keys) =>
  !!o &&
  typeof o === 'object' &&
  !Array.isArray(o) &&
  Object.keys(o).length === keys.length &&
  keys.every((k) => Object.hasOwn(o, k));

const REQUEST = ['version', 'requestId', 'videoId', 'encodedAudioSha256'];
const EXPECTED = [
  'videoId',
  'encodedAudioSha256',
  'audioDescriptorSha256',
  'audioSha256',
  'decoderWasmSha256',
  'frames',
];
const DENY = ['version', 'kind', 'requestId', 'ok', 'error'];
const OK = [
  'version',
  'kind',
  'requestId',
  'ok',
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

const cancelBody = (body) => {
  try {
    Promise.resolve(body?.cancel()).catch(() => {});
  } catch {}
};

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
          if (signal.aborted) {
            try {
              onLate?.(value);
            } catch {}
          }
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

export function freshLegacyCurrentnessNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function validateExpected(input) {
  if (
    !exact(input, EXPECTED) ||
    !V(input.videoId) ||
    !H(input.encodedAudioSha256) ||
    !H(input.audioDescriptorSha256) ||
    !H(input.audioSha256) ||
    !H(input.decoderWasmSha256) ||
    !Number.isSafeInteger(input.frames) ||
    input.frames < 1 ||
    input.frames > 14400000
  )
    throw Error('legacy_currentness_binding');
  return input;
}

function validateEndpoint(endpoint) {
  if (typeof endpoint !== 'string') throw Error('legacy_currentness_endpoint');
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw Error('legacy_currentness_endpoint');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw Error('legacy_currentness_endpoint');
  return endpoint;
}

export function createLegacyCurrentnessExchange({
  endpoint,
  fetchImpl = globalThis.fetch,
  requestIdFactory = freshLegacyCurrentnessNonce,
} = {}) {
  const url = validateEndpoint(endpoint);
  if (typeof fetchImpl !== 'function')
    throw Error('legacy_currentness_dependency');
  if (typeof requestIdFactory !== 'function')
    throw Error('legacy_currentness_dependency');

  return Object.freeze({
    async exchange(expectedInput, { signal } = {}) {
      signal?.throwIfAborted();
      const expected = validateExpected(expectedInput);
      const requestId = requestIdFactory();
      const request = {
        version: 1,
        requestId,
        videoId: expected.videoId,
        encodedAudioSha256: expected.encodedAudioSha256,
      };
      if (
        !exact(request, REQUEST) ||
        request.version !== 1 ||
        !H(request.requestId)
      )
        throw Error('legacy_currentness_request');

      // One exchange. No retry, cookies, bearer, imported route or redirects.
      const r = await waitForSignal(
        fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(request),
          signal,
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          mode: 'cors',
          referrerPolicy: 'no-referrer',
        }),
        signal,
        (late) => cancelBody(late?.body),
      );
      if (signal?.aborted) {
        cancelBody(r?.body);
        signal.throwIfAborted();
      }
      const reject = (code) => {
        cancelBody(r?.body);
        throw Error(code);
      };
      if (
        r?.status !== 200 ||
        !r.ok ||
        r.redirected ||
        r.url !== url ||
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
          r.headers.get('Content-Type') || '',
        ) ||
        !r.body
      )
        return reject('legacy_currentness_response');
      const cacheControl = (r.headers.get('Cache-Control') ?? '')
        .toLowerCase()
        .split(',')
        .map((x) => x.trim());
      if (
        !cacheControl.includes('no-store') ||
        !cacheControl.includes('no-transform')
      )
        return reject('legacy_currentness_response_headers');
      const declared = r.headers.get('Content-Length');
      if (
        declared !== null &&
        (!/^\d+$/.test(declared) || Number(declared) > MAX_RESPONSE)
      )
        return reject('legacy_currentness_response_size');

      const bytes = new Uint8Array(MAX_RESPONSE),
        reader = r.body.getReader();
      let used = 0;
      try {
        for (;;) {
          signal?.throwIfAborted();
          const { done, value } = await waitForSignal(reader.read(), signal);
          signal?.throwIfAborted();
          if (done) break;
          if (
            !(value instanceof Uint8Array) ||
            used + value.length > bytes.length
          )
            throw Error('legacy_currentness_response_size');
          bytes.set(value, used);
          used += value.length;
        }
      } finally {
        try {
          Promise.resolve(reader.cancel()).catch(() => {});
        } catch {}
        try {
          reader.releaseLock();
        } catch {}
      }
      signal?.throwIfAborted();
      if (declared !== null && used !== Number(declared))
        throw Error('legacy_currentness_response_size');

      let projection;
      try {
        projection = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            bytes.subarray(0, used),
          ),
        );
      } catch {
        throw Error('legacy_currentness_response_json');
      }
      if (
        projection?.version !== 1 ||
        projection.kind !== LEGACY_CURRENTNESS_PROJECTION_KIND ||
        projection.requestId !== requestId
      )
        throw Error('legacy_currentness_response_binding');

      if (projection.ok === false) {
        if (
          !exact(projection, DENY) ||
          projection.error !== LEGACY_CURRENTNESS_DENIAL
        )
          throw Error('legacy_currentness_response_binding');
        return Object.freeze(projection);
      }
      if (
        !exact(projection, OK) ||
        projection.ok !== true ||
        projection.videoId !== expected.videoId ||
        projection.encodedAudioSha256 !== expected.encodedAudioSha256 ||
        projection.audioDescriptorSha256 !== expected.audioDescriptorSha256 ||
        projection.audioSha256 !== expected.audioSha256 ||
        projection.decoderWasmSha256 !== expected.decoderWasmSha256 ||
        projection.frames !== expected.frames ||
        projection.sampleRate !== 48000 ||
        projection.channels !== 2 ||
        projection.sourceKind !== LEGACY_CURRENTNESS_SOURCE_KIND ||
        projection.artifactRole !== 'audio-only' ||
        projection.chartEngineBinding !== null ||
        !U(projection.publicationEpoch) ||
        projection.currentAtConfirmation !== true
      )
        throw Error('legacy_currentness_response_binding');
      return Object.freeze(projection);
    },
  });
}
