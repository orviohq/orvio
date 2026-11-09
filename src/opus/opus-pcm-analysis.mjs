// Matches existing parseWavAnalysis quantization/order without allocating a WAV.
export function parsePinnedPcmAnalysis(pcm, frames) {
  if (
    !(pcm instanceof Uint8Array) ||
    !Number.isSafeInteger(frames) ||
    frames < 1 ||
    frames > 14400000 ||
    pcm.length !== frames * 4
  )
    throw Error('opus_pcm_length');
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength),
    ratio = 48000 / 22050,
    samples = new Float32Array(Math.floor(frames / ratio));
  const mono = (i) =>
    Math.fround(
      (view.getInt16(i * 4, true) / 32768 +
        view.getInt16(i * 4 + 2, true) / 32768) /
        2,
    );
  for (let i = 0; i < samples.length; i++) {
    const x = i * ratio,
      j = Math.floor(x),
      f = x - j,
      a = mono(j),
      b = j + 1 < frames ? mono(j + 1) : a;
    samples[i] = a + (b - a) * f;
  }
  return { sampleRate: 48000, frames, samples };
}
