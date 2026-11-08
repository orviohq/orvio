const AUDIO_MAX_BYTES = 57800000,
  AUDIO_MAX_SECONDS = 300;
function inspectWav(buf) {
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
  if (dv.getUint32(0) !== 1380533830 || dv.getUint32(8) !== 1463899717)
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
    if (id === 1718449184) {
      if (fmt || sz < 16) throw Error('Invalid fmt chunk');
      fmt = {
        format: dv.getUint16(pos + 8, true),
        channels: dv.getUint16(pos + 10, true),
        sampleRate: dv.getUint32(pos + 12, true),
        bits: dv.getUint16(pos + 22, true),
      };
    } else if (id === 1684108385) {
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
    ![44100, 48e3].includes(fmt.sampleRate)
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

// Equivalent to old PCM16 stereo Float32 mono buffer then resampleLinear22050.
// Source mono rounding remains explicit, even though S16 sums fit exactly.
export function parseWavAnalysis(bytes) {
  const p = inspectWav(bytes),
    ratio = p.sampleRate / 22050,
    length = Math.floor(p.frames / ratio),
    samples = new Float32Array(length),
    dv = p.view;
  const mono = (i) => {
    const o = p.dataOffset + i * 4;
    return Math.fround(
      (dv.getInt16(o, true) / 32768 + dv.getInt16(o + 2, true) / 32768) / 2,
    );
  };
  for (let i = 0; i < length; i++) {
    const x = i * ratio,
      j = Math.floor(x),
      f = x - j,
      a = mono(j),
      b = j + 1 < p.frames ? mono(j + 1) : a;
    samples[i] = a + (b - a) * f;
  }
  return {
    sampleRate: p.sampleRate,
    frames: p.frames,
    samples,
    dataOffset: p.dataOffset,
  };
}
