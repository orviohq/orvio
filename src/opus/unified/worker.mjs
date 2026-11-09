import { generateUnifiedExtension } from './operation.mjs';
let used = false;
self.onmessage = async ({ data }) => {
  if (used) return;
  used = true;
  try {
    const { audioBytes, descriptorBytes, decoderWasmBytes, baseRecordRaw } =
      data;
    const buffers = [audioBytes, descriptorBytes, decoderWasmBytes];
    if (
      buffers.some((b) => !(b instanceof ArrayBuffer)) ||
      new Set(buffers).size !== 3
    )
      throw Error('owned_buffer_required');
    const result = await generateUnifiedExtension({
      audioBytes: new Uint8Array(audioBytes),
      descriptorBytes: new Uint8Array(descriptorBytes),
      decoderWasmBytes: new Uint8Array(decoderWasmBytes),
      baseRecordRaw,
    });
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error?.message ?? error) });
  }
};
