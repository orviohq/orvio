// canonical-pcm.mjs — Orvio canonical audio path helpers, no dependencies, no secrets.
// Pipeline: server WAV bytes (hash-verified) -> parseWav -> toMono -> resampleLinear -> analyzePcm.
// Deterministic across browsers: pure JS arithmetic only, no WebAudio decode, no native resampler.

// Guarded RIFF/WAVE parser for PCM16 stereo at 44.1/48 kHz.
// Returns {sampleRate, channels, bitsPerSample, frames, samples: Float32Array interleaved (-1..1)}.
export function parseWav(buf) {
  const dv =
    buf instanceof DataView
      ? buf
      : new DataView(buf.buffer || buf, buf.byteOffset || 0, buf.byteLength);
  if (dv.byteLength < 44 || dv.getUint32(4, true) + 8 !== dv.byteLength)
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
  if (dataLen === 0 || dataLen % 4 || dataLen > fmt.sampleRate * 4 * 130)
    throw Error('Invalid canonical PCM length');
  const bytesPer = fmt.bits >> 3;
  const frames = Math.floor(dataLen / (bytesPer * fmt.channels));
  const samples = new Float32Array(frames * fmt.channels);
  for (let i = 0; i < frames * fmt.channels; i++) {
    const o = dataOff + i * bytesPer;
    let v;
    if (fmt.format === 3 && fmt.bits === 32) v = dv.getFloat32(o, true);
    else if (fmt.bits === 16) v = dv.getInt16(o, true) / 32768;
    else if (fmt.bits === 8) v = (dv.getUint8(o) - 128) / 128;
    else if (fmt.bits === 24) {
      const b0 = dv.getUint8(o),
        b1 = dv.getUint8(o + 1),
        b2 = dv.getUint8(o + 2);
      let x = b0 | (b1 << 8) | (b2 << 16);
      if (x & 0x800000) x |= 0xff000000;
      v = x / 8388608;
    } else if (fmt.bits === 32 && fmt.format === 1)
      v = dv.getInt32(o, true) / 2147483648;
    else
      throw new Error('unsupported wav format ' + fmt.format + '/' + fmt.bits);
    samples[i] = v;
  }
  return {
    sampleRate: fmt.sampleRate,
    channels: fmt.channels,
    bitsPerSample: fmt.bits,
    frames,
    samples,
  };
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
