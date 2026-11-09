// PRIVATE actual acquired-job v2 seam. BUILD supplies owner-bound functions.
// No endpoint, fetch interception, ETag fabrication, create/advance or admission.
import {
  DECODER,
  FORMAT,
  parseVerifiedDescriptor,
  verifyEncodedParts,
} from './opus-descriptor.mjs';
const H = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const exact = (o, k) =>
  o &&
  typeof o === 'object' &&
  !Array.isArray(o) &&
  Object.keys(o).length === k.length &&
  k.every((n) => Object.hasOwn(o, n));
export function captureAcquiredOpusV2(input) {
  const j = structuredClone(input);
  if (
    !j ||
    j.ok !== true ||
    j.version !== 2 ||
    j.kind !== 'orvio-opus-acquired-job-v2' ||
    typeof j.videoId !== 'string' ||
    !/^[A-Za-z0-9_-]{11}$/.test(j.videoId) ||
    typeof j.jobId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      j.jobId,
    ) ||
    !['pending', 'unknown', 'verified'].includes(j.status)
  )
    throw Error('acquired_v2_job');
  if (j.status !== 'verified') {
    if (
      !exact(j, [
        'ok',
        'version',
        'kind',
        'jobId',
        'videoId',
        'status',
        'phase',
      ]) ||
      typeof j.phase !== 'string' ||
      !j.phase.length ||
      j.phase.length > 64
    )
      throw Error('acquired_v2_pending');
    return j;
  }
  const a = j.audio;
  if (
    !exact(j, [
      'ok',
      'version',
      'kind',
      'jobId',
      'videoId',
      'status',
      'audio',
    ]) ||
    !exact(a, [
      'audioFormat',
      'contentType',
      'sha256',
      'encodedAudioSha256',
      'audioDescriptorSha256',
      'decoderWasmSha256',
      'bytes',
      'frames',
      'sampleRate',
      'channels',
    ]) ||
    a.audioFormat !== FORMAT ||
    a.contentType !== 'audio/ogg' ||
    !H(a.sha256) ||
    !H(a.encodedAudioSha256) ||
    !H(a.audioDescriptorSha256) ||
    a.decoderWasmSha256 !== DECODER ||
    !Number.isSafeInteger(a.bytes) ||
    a.bytes < 1 ||
    a.bytes > 6000000 ||
    !Number.isSafeInteger(a.frames) ||
    a.frames < 1 ||
    a.frames > 14400000 ||
    a.sampleRate !== 48000 ||
    a.channels !== 2
  )
    throw Error('acquired_v2_audio');
  return j;
}
export const detachCancel = (body) => {
  try {
    Promise.resolve(body?.cancel()).catch(() => {});
  } catch {}
};
export function waitAcquired(promise, signal, onLate) {
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
      (x) => {
        if (settled) {
          if (signal.aborted)
            try {
              onLate?.(x);
            } catch {}
          return;
        }
        settled = true;
        signal.removeEventListener('abort', abort);
        resolve(x);
      },
      (e) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        reject(e);
      },
    );
    if (signal.aborted) abort();
  });
}
async function readExact(r, max, expected, signal) {
  const h = r.headers.get('Content-Length'),
    n = Number(h);
  if (
    !h ||
    !/^\d+$/.test(h) ||
    !Number.isSafeInteger(n) ||
    n < 1 ||
    n > max ||
    (expected !== undefined && n !== expected) ||
    !r.body
  ) {
    detachCancel(r.body);
    throw Error('acquired_v2_length');
  }
  const out = new Uint8Array(n),
    reader = r.body.getReader();
  let off = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await waitAcquired(reader.read(), signal);
      signal?.throwIfAborted();
      if (done) break;
      if (!(value instanceof Uint8Array) || off + value.length > n)
        throw Error('acquired_v2_overflow');
      out.set(value, off);
      off += value.length;
    }
  } finally {
    try {
      Promise.resolve(reader.cancel()).catch(() => {});
    } catch {}
    try {
      reader.releaseLock();
    } catch {}
  }
  if (off !== n) throw Error('acquired_v2_truncated');
  return out;
}
export function createAcquiredOpusV2Artifacts({ readArtifact }) {
  if (typeof readArtifact !== 'function') throw Error('acquired_v2_capability');
  return Object.freeze({
    async load(input, { signal } = {}) {
      signal?.throwIfAborted();
      const j = captureAcquiredOpusV2(input);
      if (j.status !== 'verified') throw Error('acquired_v2_not_verified');
      const a = j.audio;
      const req = {
        videoId: j.videoId,
        jobId: j.jobId,
        audioSha256: a.sha256,
        encodedAudioSha256: a.encodedAudioSha256,
        audioDescriptorSha256: a.audioDescriptorSha256,
      };
      async function get(kind, max, n) {
        signal?.throwIfAborted();
        const r = await waitAcquired(
          readArtifact({ ...req, kind }, { method: 'GET', signal }),
          signal,
          (r) => detachCancel(r?.body),
        );
        if (signal?.aborted) {
          detachCancel(r?.body);
          signal.throwIfAborted();
        }
        const headers = r?.headers;
        if (
          r?.status !== 200 ||
          r.redirected ||
          !headers ||
          headers.get('Content-Type') !==
            (kind === 'audio' ? 'audio/ogg' : 'application/json') ||
          ![
            'no-store',
            'no-store, no-transform',
            'no-store,no-transform',
          ].includes(headers.get('Cache-Control')) ||
          headers.get('X-Content-Type-Options') !== 'nosniff' ||
          headers.get('X-Audio-Contract') !== FORMAT ||
          headers.get('X-PCM16-SHA256') !== a.sha256 ||
          headers.get('X-Content-SHA256') !==
            (kind === 'audio'
              ? a.encodedAudioSha256
              : a.audioDescriptorSha256) ||
          headers.get('X-Descriptor-SHA256') !== a.audioDescriptorSha256 ||
          headers.get('X-Source-Video-Id') !== j.videoId
        ) {
          detachCancel(r?.body);
          throw Error('acquired_v2_headers');
        }
        return readExact(r, max, n, signal);
      }
      const descriptorBytes = await get('descriptor', 32768),
        d = await parseVerifiedDescriptor(
          descriptorBytes,
          a.audioDescriptorSha256,
        );
      signal?.throwIfAborted();
      if (
        d.videoId !== j.videoId ||
        d.oggSha256 !== a.encodedAudioSha256 ||
        d.pcm16Sha256 !== a.sha256 ||
        d.decoderWasmSha256 !== a.decoderWasmSha256 ||
        d.oggBytes !== a.bytes ||
        d.frames !== a.frames ||
        d.sampleRate !== a.sampleRate ||
        d.channels !== a.channels
      )
        throw Error('acquired_v2_descriptor_binding');
      const bytes = await get('audio', 6000000, d.oggBytes);
      await verifyEncodedParts(bytes, d);
      signal?.throwIfAborted();
      return {
        descriptor: d,
        descriptorBytes,
        descriptorSha256: a.audioDescriptorSha256,
        bytes,
      };
    },
  });
}
