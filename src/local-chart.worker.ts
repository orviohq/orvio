import { generateRecordFromAnalysis } from './current35-budget-v1.mjs';

import { parseWavAnalysis } from './fused-resampler.mjs';
const hash = async (bytes: BufferSource) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
const scope = self as unknown as {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: unknown, transfer: Transferable[]) => void;
};
scope.onmessage = async ({ data }) => {
  const { id, bytes, videoId, audioSha256 } = data;
  try {
    if (
      !(bytes instanceof ArrayBuffer) ||
      !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
      !/^[a-f0-9]{64}$/.test(audioSha256) ||
      (await hash(bytes)) !== audioSha256
    )
      throw Error('audio_integrity_failed');
    const parsed = parseWavAnalysis(bytes);
    const record = await generateRecordFromAnalysis(
      parsed,
      videoId,
      audioSha256,
    );
    const base = JSON.stringify(record),
      baseRecordSha256 = await hash(new TextEncoder().encode(base));

    scope.postMessage({ id, ok: true, bytes, record, baseRecordSha256 }, [
      bytes,
    ]);
  } catch (e) {
    scope.postMessage(
      {
        id,
        ok: false,
        error: String(e),
        ...(bytes instanceof ArrayBuffer ? { bytes } : {}),
      },
      bytes instanceof ArrayBuffer ? [bytes] : [],
    );
  }
};
