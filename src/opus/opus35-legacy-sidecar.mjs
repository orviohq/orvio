// Verified fixed legacy-sidecar transport codec.
// Build-owned allowlist is authority. Callers select only a reviewed fixed id;
// they cannot supply expected hashes, manifest fields, headers or a base URL.
import {
  LEGACY_INVENTORY_ENTRIES,
  DEFAULT_LEGACY_MANIFEST_ID,
} from './legacy-source-inventory.mjs';
import { parseVerifiedDescriptor, sha256 } from './opus-descriptor.mjs';

// Same reviewed build origin as opus35-api.ts (external-audio-api AUDIO_BASE).
export const LEGACY_SIDECAR_BASE = 'https://orvio-share.pn-26f.workers.dev';
export const LEGACY_SIDECAR_MANIFEST_MAX = 32768;
export const LEGACY_SIDECAR_PART_MAX = 1048576;
export const LEGACY_SIDECAR_PUBLIC_MANIFEST_SHA256 =
  LEGACY_INVENTORY_ENTRIES[0].bodySha256;
export const FIXED_LEGACY_SIDECAR_ID = DEFAULT_LEGACY_MANIFEST_ID;
const FIXED_SIDECARS = new Map(
  LEGACY_INVENTORY_ENTRIES.map((entry) => [
    entry.manifestId,
    Object.freeze({
      manifest: entry.publicManifest,
      bodySha256: entry.bodySha256,
    }),
  ]),
);

const FIELDS = Object.keys(LEGACY_INVENTORY_ENTRIES[0].publicManifest);
const PAYLOAD_FIELDS = ['key', 'bytes', 'sha256'];
const HASH = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const fail = (code) => {
  throw Error('legacy_sidecar_' + code);
};

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

function plain(o) {
  return !!o && typeof o === 'object' && !Array.isArray(o);
}

function exactFields(o, fields) {
  return (
    plain(o) &&
    Object.keys(o).length === fields.length &&
    fields.every((k) => Object.hasOwn(o, k))
  );
}

// Structural equality; key insertion order is deliberately irrelevant.
function same(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => same(v, b[i]))
    );
  }
  if (!plain(a) || !plain(b)) return false;
  const ka = Object.keys(a).sort(),
    kb = Object.keys(b).sort();
  return (
    ka.length === kb.length &&
    ka.every((k, i) => k === kb[i] && same(a[k], b[k]))
  );
}

function validateManifestShape(m) {
  if (!exactFields(m, FIELDS)) fail('manifest_shape');
  if (
    m.version !== 1 ||
    m.kind !== 'fixed-offline-legacy-sidecar-v1' ||
    typeof m.videoId !== 'string' ||
    !/^[A-Za-z0-9_-]{11}$/.test(m.videoId) ||
    !HASH(m.sourceSha256) ||
    !Number.isSafeInteger(m.sourceBytes) ||
    m.sourceBytes < 44 ||
    !HASH(m.oldChartSetSha256) ||
    typeof m.oldJobId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      m.oldJobId,
    ) ||
    !HASH(m.descriptorSha256) ||
    !HASH(m.encodedAudioSha256) ||
    !HASH(m.pcm16Sha256) ||
    !Number.isSafeInteger(m.frames) ||
    m.frames < 1 ||
    m.frames > 14400000 ||
    !HASH(m.encoderWasmSha256) ||
    !HASH(m.decoderWasmSha256) ||
    !HASH(m.sourceManifestSha256) ||
    !Number.isSafeInteger(m.reservationBytes) ||
    m.reservationBytes < 1 ||
    !Number.isSafeInteger(m.storedEnvelopeLimit) ||
    m.storedEnvelopeLimit < 1 ||
    !HASH(m.id) ||
    m.artifactRole !== 'audio-only' ||
    m.chartEngineBinding !== null ||
    !Array.isArray(m.payloads) ||
    m.payloads.length < 2 ||
    m.payloads.length > 7
  )
    fail('manifest_shape');
  for (let i = 0; i < m.payloads.length; i++) {
    const p = m.payloads[i],
      last = i === m.payloads.length - 1;
    if (
      !exactFields(p, PAYLOAD_FIELDS) ||
      !HASH(p.sha256) ||
      !Number.isSafeInteger(p.bytes) ||
      p.bytes < 1 ||
      p.bytes > LEGACY_SIDECAR_PART_MAX ||
      p.key !== (last ? 'descriptor' : 'part:' + i)
    )
      fail('manifest_payload');
    if (i < m.payloads.length - 2 && p.bytes !== LEGACY_SIDECAR_PART_MAX)
      fail('manifest_payload');
  }
  return m;
}

function allowlist(manifestId) {
  if (typeof manifestId !== 'string' || !FIXED_SIDECARS.has(manifestId))
    fail('manifest_unknown');
  return FIXED_SIDECARS.get(manifestId);
}

function cacheControlPass(value) {
  const parts = (value ?? '')
    .toLowerCase()
    .split(',')
    .map((x) => x.trim());
  return parts.includes('no-store') && parts.includes('no-transform');
}

function rejectResponse(r, code) {
  cancelBody(r?.body);
  fail(code);
}

function headerPass(r, expected) {
  if (
    r.status !== 200 ||
    r.redirected ||
    !r.body ||
    r.headers.get('X-Content-SHA256') !== expected.contentSha256 ||
    r.headers.get('X-Source-Video-Id') !== expected.videoId ||
    r.headers.get('X-Legacy-Audio-SHA256') !== expected.sourceSha256 ||
    r.headers.get('X-Legacy-ChartSet-SHA256') !== expected.oldChartSetSha256 ||
    !cacheControlPass(r.headers.get('Cache-Control')) ||
    r.headers.get('Content-Type') !== expected.contentType
  )
    rejectResponse(r, 'response_headers');
}

async function readExact(response, expectedLength, max, signal) {
  const header = response.headers.get('Content-Length');
  const declared = Number(header);
  if (
    !header ||
    !/^\d+$/.test(header) ||
    !Number.isSafeInteger(declared) ||
    declared < 1 ||
    declared > max ||
    (expectedLength !== undefined && declared !== expectedLength)
  ) {
    cancelBody(response.body);
    fail('content_length');
  }
  const out = new Uint8Array(declared),
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
        offset + value.length > declared
      )
        fail('body_overflow');
      out.set(value, offset);
      offset += value.length;
    }
  } finally {
    release();
  }
  signal?.throwIfAborted();
  if (offset !== declared) fail('body_truncated');
  return out;
}

function assertNoRedirect(response) {
  if (response.redirected) rejectResponse(response, 'response_headers');
}

export function parseLegacySidecarManifest(bytes, { manifestId } = {}) {
  const fixed = allowlist(manifestId);
  if (!(bytes instanceof Uint8Array) || bytes.length > LEGACY_SIDECAR_MANIFEST_MAX)
    fail('manifest_size');
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    fail('manifest_json');
  }
  validateManifestShape(parsed);
  if (!same(parsed, fixed.manifest)) fail('manifest_not_reviewed');
  return parsed;
}

export function createLegacySidecarArtifactLoader({
  fetcher = globalThis.fetch,
} = {}) {
  if (typeof fetcher !== 'function') fail('fetcher');
  return async function loadLegacySidecarArtifacts({
    manifestId = FIXED_LEGACY_SIDECAR_ID,
    signal,
  } = {}) {
    const fixed = allowlist(manifestId);
    signal?.throwIfAborted();

    const root = `${LEGACY_SIDECAR_BASE}/v2/legacy-sidecars/${fixed.manifest.id}`;
    const get = async (url) => {
      const response = await waitForSignal(
        fetcher(url, { method: 'GET', signal, redirect: 'error' }),
        signal,
        (r) => cancelBody(r?.body),
      );
      if (signal?.aborted) {
        cancelBody(response?.body);
        signal.throwIfAborted();
      }
      return response;
    };

    const manifestResponse = await get(root + '/manifest');
    assertNoRedirect(manifestResponse);
    headerPass(manifestResponse, {
      contentSha256: fixed.bodySha256,
      videoId: fixed.manifest.videoId,
      sourceSha256: fixed.manifest.sourceSha256,
      oldChartSetSha256: fixed.manifest.oldChartSetSha256,
      contentType: 'application/json',
    });
    const manifestBytes = await readExact(
      manifestResponse,
      undefined,
      LEGACY_SIDECAR_MANIFEST_MAX,
      signal,
    );
    if ((await sha256(manifestBytes)) !== fixed.bodySha256)
      fail('manifest_identity');
    const manifest = parseLegacySidecarManifest(manifestBytes, { manifestId });

    const payloads = [];
    for (let i = 0; i < manifest.payloads.length; i++) {
      signal?.throwIfAborted();
      const p = manifest.payloads[i],
        last = i === manifest.payloads.length - 1;
      const response = await get(root + '/payload/' + i);
      assertNoRedirect(response);
      headerPass(response, {
        contentSha256: p.sha256,
        videoId: manifest.videoId,
        sourceSha256: manifest.sourceSha256,
        oldChartSetSha256: manifest.oldChartSetSha256,
        contentType: last ? 'application/json' : 'application/octet-stream',
      });
      const bytes = await readExact(
        response,
        p.bytes,
        LEGACY_SIDECAR_PART_MAX,
        signal,
      );
      if ((await sha256(bytes)) !== p.sha256) fail('payload_identity');
      payloads.push(bytes);
    }

    const parts = payloads.slice(0, -1),
      descriptorBytes = payloads.at(-1),
      oggBytes = parts.reduce((n, b) => n + b.length, 0);
    const bytes = new Uint8Array(oggBytes);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    if ((await sha256(bytes)) !== manifest.encodedAudioSha256)
      fail('encoded_identity');

    const descriptorSha256 = manifest.descriptorSha256;
    const descriptor = await parseVerifiedDescriptor(
      descriptorBytes,
      descriptorSha256,
    );
    if (
      descriptor.videoId !== manifest.videoId ||
      descriptor.oggSha256 !== manifest.encodedAudioSha256 ||
      descriptor.oggBytes !== oggBytes ||
      descriptor.pcm16Sha256 !== manifest.pcm16Sha256 ||
      descriptor.frames !== manifest.frames ||
      descriptor.decoderWasmSha256 !== manifest.decoderWasmSha256 ||
      descriptor.encoderWasmSha256 !== manifest.encoderWasmSha256 ||
      descriptor.source.sha256 !== manifest.sourceSha256 ||
      descriptor.source.bytes !== manifest.sourceBytes ||
      descriptor.source.frames !== manifest.frames ||
      descriptor.source.sampleRate !== 48000 ||
      descriptor.source.channels !== 2 ||
      descriptor.parts.length !== parts.length
    )
      fail('descriptor_binding');
    for (let i = 0; i < parts.length; i++) {
      const p = descriptor.parts[i],
        expected = manifest.payloads[i];
      if (
        p.index !== i ||
        p.bytes !== expected.bytes ||
        p.sha256 !== expected.sha256 ||
        parts[i].length !== expected.bytes
      )
        fail('descriptor_part_binding');
    }

    return {
      manifestId: manifest.id,
      manifest,
      manifestBytes,
      manifestBodySha256: fixed.bodySha256,
      descriptor,
      descriptorBytes,
      descriptorSha256,
      bytes,
      encodedAudioSha256: manifest.encodedAudioSha256,
    };
  };
}

export const loadLegacySidecarArtifacts =
  createLegacySidecarArtifactLoader();
