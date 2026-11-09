// Worker/manifest bytes and identities are generated only from the reviewed
// local source closure. No URL, source, identity or policy argument is accepted.
import {
  workerBase64,
  manifestBase64,
  UNIFIED_BUILD,
} from './build.generated.mjs';
const decode = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const digest = async (b) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('');
export async function generateUnifiedExtensionOwned({
  audioBytes,
  descriptorBytes,
  decoderWasmBytes,
  baseRecordRaw,
  signal,
}) {
  signal?.throwIfAborted();
  if (
    location.origin !== 'https://orvio-play.pages.dev' &&
    !['http://localhost', 'http://127.0.0.1'].some(
      (o) => location.origin === o || location.origin.startsWith(o + ':'),
    )
  )
    throw Error('owned_build_origin');
  const buffers = [audioBytes, descriptorBytes, decoderWasmBytes];
  if (
    buffers.some((b) => !(b instanceof ArrayBuffer)) ||
    new Set(buffers).size !== 3
  )
    throw Error('owned_buffers_required');
  const owned = structuredClone(
    { audioBytes, descriptorBytes, decoderWasmBytes, baseRecordRaw },
    { transfer: buffers },
  );
  const workerBytes = decode(workerBase64),
    manifestBytes = decode(manifestBase64);
  if (
    workerBytes.length !== UNIFIED_BUILD.workerBytes ||
    (await digest(workerBytes)) !== UNIFIED_BUILD.producerSha256 ||
    manifestBytes.length !== UNIFIED_BUILD.manifestBytes ||
    (await digest(manifestBytes)) !== UNIFIED_BUILD.manifestSha256
  )
    throw Error('owned_build_identity');
  signal?.throwIfAborted();
  let worker, url;
  try {
    url = URL.createObjectURL(
      new Blob([workerBytes], { type: 'text/javascript' }),
    );
    worker = new Worker(url, { type: 'module' });
    const result = await new Promise((resolve, reject) => {
      let done = false;
      const finish = (error, value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        error ? reject(error) : resolve(value);
      };
      const abort = () =>
        finish(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      const timer = setTimeout(
        () => finish(Error('candidate_worker_timeout')),
        180000,
      );
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) {
        abort();
        return;
      }
      worker.onmessage = ({ data }) =>
        data?.ok === true
          ? finish(null, data.result)
          : finish(
              Error(
                'generate_worker_failed:' + String(data?.error ?? 'unknown'),
              ),
            );
      worker.onerror = () => finish(Error('generate_worker_failed'));
      worker.postMessage(owned, [
        owned.audioBytes,
        owned.descriptorBytes,
        owned.decoderWasmBytes,
      ]);
    });
    return {
      ...result,
      loadedBuild: Object.freeze({
        workerSha256: UNIFIED_BUILD.producerSha256,
        buildRootSha256: UNIFIED_BUILD.manifestSha256,
      }),
    };
  } finally {
    worker?.terminate();
    if (url) URL.revokeObjectURL(url);
  }
}
