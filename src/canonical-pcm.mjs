import { AUDIO_MAX_SECONDS, AUDIO_MAX_BYTES } from './audio-limits.mjs';
// canonical-pcm.mjs — Orvio canonical audio path helpers, no dependencies, no secrets.
// Pipeline: server WAV bytes (hash-verified) -> parseWav -> toMono -> resampleLinear -> analyzePcm.
// Deterministic across browsers: pure JS arithmetic only, no WebAudio decode, no native resampler.

// Guarded RIFF/WAVE parser for PCM16 stereo at 44.1/48 kHz.
// Returns {sampleRate, channels, bitsPerSample, frames, samples: Float32Array interleaved (-1..1)}.
export function inspectWav(buf) {
  const dv =
    buf instanceof DataView
      ? buf
      : new DataView(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength);
  if (
    dv.byteLength > AUDIO_MAX_BYTES ||
    dv.byteLength < 44 ||
    dv.getUint32(4, true) + 8 !== dv.byteLength
  )
    throw Error('Invalid WAV length');
  if (dv.getUint32(0) !== 0x52494646 || dv.getUint32(8) !== 0x57415645)
    throw new Error('not RIFF/WAVE');
  let pos = 12,
    fmt = null,
    dataOff = -1,
    dataLen = 0;
  while (pos + 8 <= dv.byteLength) {
    const id = dv.getUint32(pos),
      sz = dv.getUint32(pos + 4, true);
    if (pos + 8 + sz + (sz & 1) > dv.byteLength)
      throw Error('Truncated WAV chunk');
    if (id === 0x666d7420) {
      // 'fmt '
      if (fmt || sz < 16) throw Error('Invalid fmt chunk');
      fmt = {
        format: dv.getUint16(pos + 8, true),
        channels: dv.getUint16(pos + 10, true),
        sampleRate: dv.getUint32(pos + 12, true),
        bits: dv.getUint16(pos + 22, true),
      };
    } else if (id === 0x64617461) {
      // 'data'
      if (dataOff >= 0) throw Error('Duplicate data chunk');
      dataOff = pos + 8;
      dataLen = sz;
    }
    pos += 8 + sz + (sz & 1);
  }
  if (!fmt || dataOff < 0) throw new Error('missing fmt or data chunk');
  if (
    fmt.format !== 1 ||
    fmt.bits !== 16 ||
    fmt.channels !== 2 ||
    ![44100, 48000].includes(fmt.sampleRate)
  )
    throw Error('Unsupported canonical format');
  if (
    dataLen === 0 ||
    dataLen % 4 ||
    dataLen > fmt.sampleRate * 4 * AUDIO_MAX_SECONDS
  )
    throw Error('Invalid canonical PCM length');
  return {
    sampleRate: fmt.sampleRate,
    channels: fmt.channels,
    bitsPerSample: fmt.bits,
    frames: dataLen / 4,
    view: dv,
    dataOffset: dataOff,
  };
}

// Keep the original interleaved API for callers that need its exact samples.
export function parseWav(buf) {
  const p = inspectWav(buf),
    samples = new Float32Array(p.frames * p.channels);
  for (let i = 0; i < samples.length; i++)
    samples[i] = p.view.getInt16(p.dataOffset + i * 2, true) / 32768;
  return {
    sampleRate: p.sampleRate,
    channels: p.channels,
    bitsPerSample: p.bitsPerSample,
    frames: p.frames,
    samples,
  };
}

// PCM16 values are exact binary fractions. This is byte-identical to
// toMono(parseWav(buf)) without allocating the full stereo Float32 copy.
export function parseWavMono(buf) {
  const p = inspectWav(buf),
    samples = new Float32Array(p.frames);
  for (let i = 0; i < p.frames; i++) {
    const o = p.dataOffset + i * 4;
    samples[i] =
      (p.view.getInt16(o, true) / 32768 +
        p.view.getInt16(o + 2, true) / 32768) /
      2;
  }
  return { sampleRate: p.sampleRate, frames: p.frames, samples };
}

// Channel average to mono. Deterministic: left-to-right accumulation.
export function toMono(parsed) {
  if (parsed.channels === 1) return parsed.samples;
  const out = new Float32Array(parsed.frames);
  for (let i = 0; i < parsed.frames; i++) {
    let s = 0;
    for (let c = 0; c < parsed.channels; c++)
      s += parsed.samples[i * parsed.channels + c];
    out[i] = s / parsed.channels;
  }
  return out;
}

// Pinned linear-interpolation resampler. Intentionally simple: the point is identical
// output on every platform, not maximum fidelity. Same input -> same output everywhere.
export function resampleLinear(mono, fromRate, toRate) {
  if (fromRate === toRate) return mono;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(mono.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio,
      j = Math.floor(x),
      f = x - j;
    const a = mono[j],
      b = j + 1 < mono.length ? mono[j + 1] : a;
    out[i] = a + (b - a) * f;
  }
  return out;
}
