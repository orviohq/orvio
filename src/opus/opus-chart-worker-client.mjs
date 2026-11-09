export async function prepareOpusOwned({
  workerUrl,
  bytes,
  wasmBytes,
  descriptorBytes,
  descriptorSha256,
  signal,
  frozenRecord,
}) {
  signal?.throwIfAborted();
  const worker = new Worker(workerUrl, { type: 'module' });
  try {
    return await new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => signal?.removeEventListener('abort', abort);
      const abort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abort, { once: true });
      worker.onmessage = ({ data }) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (data?.ok) resolve(data);
        else reject(Error(data?.error || 'opus_worker_failed'));
      };
      worker.onerror = (e) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(Error(e.message || 'opus_worker_failed'));
      };
      worker.postMessage(
        { bytes, wasmBytes, descriptorBytes, descriptorSha256, frozenRecord },
        [bytes, wasmBytes, descriptorBytes],
      );
    });
  } finally {
    worker.terminate();
  }
}
// Invoke only after the owned worker has terminated and verified output returned.
export function opusPcmToAudioBuffer(context, pcm16, frames) {
  if (
    !(pcm16 instanceof ArrayBuffer) ||
    !Number.isSafeInteger(frames) ||
    frames < 1 ||
    frames > 14400000 ||
    pcm16.byteLength !== frames * 4
  )
    throw Error('opus_playback_pcm');
  const buffer = context.createBuffer(2, frames, 48000),
    view = new DataView(pcm16),
    L = buffer.getChannelData(0),
    R = buffer.getChannelData(1);
  for (let i = 0; i < frames; i++) {
    L[i] = view.getInt16(i * 4, true) / 32768;
    R[i] = view.getInt16(i * 4 + 2, true) / 32768;
  }
  return buffer;
}
