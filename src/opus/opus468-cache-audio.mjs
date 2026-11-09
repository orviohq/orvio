// Private trusted audio supplier. No network-audio fallback; cache bytes never
// count as decoded proof. The owned worker checks complete PCM before return.
import workerUrl from './opus-chart.worker.mjs?worker&url';
import wasmUrl from '../opus-codec/opus-decoder.wasm?url';
import { parseVerifiedDescriptor } from './opus-descriptor.mjs';
import { readVerifiedOpus } from './opus-cache.mjs';
import { prepareOpusOwned } from './opus-chart-worker-client.mjs';
export async function readOpus468CacheAudio(base, signal, descriptorBytes) {
  signal?.throwIfAborted();
  const descriptor = await parseVerifiedDescriptor(
    descriptorBytes,
    base.audioDescriptorSha256,
  );
  const cached = await readVerifiedOpus(
    descriptor,
    base.audioDescriptorSha256,
    signal,
  );
  if (!cached) throw Error('extension_audio_cache_missing');
  if (JSON.stringify(cached.record) !== JSON.stringify(base))
    throw Error('extension_audio_base');
  const response = await fetch(wasmUrl, { signal });
  if (!response.ok) throw Error('extension_decoder_unavailable');
  const wasmBytes = await response.arrayBuffer();
  const result = await prepareOpusOwned({
    workerUrl,
    bytes: new Uint8Array(cached.bytes).slice().buffer,
    wasmBytes,
    descriptorBytes: descriptorBytes.slice().buffer,
    descriptorSha256: base.audioDescriptorSha256,
    signal,
    frozenRecord: base,
  });
  signal?.throwIfAborted();
  return result.pcm16;
}
