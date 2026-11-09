import { verifyOpusRecord } from './opus-record.ts';
import {
  parseVerifiedDescriptor,
  verifyEncodedParts,
  sha256,
} from './opus-descriptor.mjs';
import { opusCacheKey } from './opus-loader.mjs';
const DB = 'orvio.opus-verified.v1',
  STORE = 'encoded';
function open() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore(STORE, { keyPath: 'key' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function operation(mode, work, signal) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      signal?.throwIfAborted();
      const tx = db.transaction(STORE, mode);
      const abort = () => {
        try {
          tx.abort();
        } catch {}
      };
      signal?.addEventListener('abort', abort, { once: true });
      const clean = () => signal?.removeEventListener('abort', abort);
      const req = work(tx.objectStore(STORE));
      let result;
      req.onsuccess = () => (result = req.result);
      tx.oncomplete = () => {
        clean();
        resolve(result);
      };
      tx.onerror = () => {
        clean();
        reject(tx.error);
      };
      tx.onabort = () => {
        clean();
        reject(
          signal?.aborted
            ? signal.reason
            : tx.error || Error('opus_cache_aborted'),
        );
      };
    });
  } finally {
    db.close();
  }
}
// Called only after owned worker verifies full PCM and produces matching v2 record.
export async function saveVerifiedOpus(
  { descriptorBytes, descriptorSha256, bytes, record },
  signal,
) {
  signal?.throwIfAborted();
  const d = await parseVerifiedDescriptor(descriptorBytes, descriptorSha256);
  await verifyEncodedParts(bytes, d);
  if (
    !(await verifyOpusRecord(record, d, descriptorSha256)) ||
    record?.version !== 2 ||
    record.audioFormat !== d.audioFormat ||
    record.audioSha256 !== d.pcm16Sha256 ||
    record.audioDescriptorSha256 !== descriptorSha256 ||
    record.encodedAudioSha256 !== d.oggSha256 ||
    record.videoId !== d.videoId ||
    record.frames !== d.frames
  )
    throw Error('opus_cache_record_binding');
  signal?.throwIfAborted();
  const key =
    opusCacheKey(d, descriptorSha256) + ':chart:' + record.chartSetSha256;
  await operation(
    'readwrite',
    (s) => s.put({ key, descriptorBytes, descriptorSha256, bytes, record }),
    signal,
  );
  signal?.throwIfAborted();
  return key;
}
async function validateDetachedCacheRow(item, key, descriptorSha256, signal) {
  signal?.throwIfAborted();
  const descriptor = await parseVerifiedDescriptor(
    item.descriptorBytes,
    descriptorSha256,
  );
  if (
    opusCacheKey(descriptor, descriptorSha256) +
      ':chart:' +
      item.record.chartSetSha256 !==
    key
  )
    throw Error('opus_cache_identity');
  await verifyEncodedParts(item.bytes, descriptor);
  if (!(await verifyOpusRecord(item.record, descriptor, descriptorSha256)))
    throw Error('opus_cache_record_integrity');
  signal?.throwIfAborted();
  return descriptor;
}
export async function readVerifiedOpus(d, descriptorSha256, signal, record) {
  signal?.throwIfAborted();
  const key =
      opusCacheKey(d, descriptorSha256) + ':chart:' + record.chartSetSha256,
    item = await operation('readonly', (s) => s.get(key), signal);
  if (!item) return null;
  await validateDetachedCacheRow(item, key, descriptorSha256, signal);
  return item;
}
// v2 replay envelope is deliberately not emitted by the legacy share serializer.
export function canShareWithLegacyEnvelope(record) {
  return record?.version === 1 && record.audioFormat === undefined;
}
// Build-owned local resolver. Keys come from an already bound record, never a
// scan, best match or remote URL. A key hit is not verification.
export async function readVerifiedOpusByRoots(roots, { signal } = {}) {
  const r = structuredClone(roots),
    hash = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
  if (
    !/^[A-Za-z0-9_-]{11}$/.test(r?.videoId) ||
    [
      'audioSha256',
      'encodedAudioSha256',
      'audioDescriptorSha256',
      'decoderWasmSha256',
      'chartSetSha256',
    ].some((k) => !hash(r[k]))
  )
    throw Error('opus_cache_roots');
  const key =
    opusCacheKey(
      {
        videoId: r.videoId,
        oggSha256: r.encodedAudioSha256,
        pcm16Sha256: r.audioSha256,
        decoderWasmSha256: r.decoderWasmSha256,
      },
      r.audioDescriptorSha256,
    ) +
    ':chart:' +
    r.chartSetSha256;
  signal?.throwIfAborted();
  const item = await operation('readonly', (s) => s.get(key), signal);
  if (!item) return null;
  const descriptor = await validateDetachedCacheRow(
    item,
    key,
    r.audioDescriptorSha256,
    signal,
  );
  if (
    descriptor.videoId !== r.videoId ||
    descriptor.oggSha256 !== r.encodedAudioSha256 ||
    descriptor.pcm16Sha256 !== r.audioSha256 ||
    descriptor.decoderWasmSha256 !== r.decoderWasmSha256
  )
    throw Error('opus_cache_roots_binding');
  return item;
}
