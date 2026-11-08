import { it, expect } from 'vitest';
import {
  inspectWav,
  parseWav,
  parseWavMono,
  toMono,
} from '../src/canonical-pcm.mjs';
import { AUDIO_MAX_BYTES, AUDIO_MAX_SECONDS } from '../src/audio-limits.mjs';
function wav(rate: number, frames: number) {
  const bytes = new ArrayBuffer(44 + frames * 4),
    v = new DataView(bytes);
  for (const [o, s] of [
    [0, 'RIFF'],
    [8, 'WAVE'],
    [12, 'fmt '],
    [36, 'data'],
  ] as const)
    for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i));
  v.setUint32(4, bytes.byteLength - 8, true);
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  v.setUint32(40, frames * 4, true);
  return bytes;
}
it('accepts exactly 300s at every canonical rate, rejects the next frame', () => {
  expect(AUDIO_MAX_SECONDS).toBe(300);
  for (const rate of [44100, 48000]) {
    const b = wav(rate, rate * 300);
    expect(b.byteLength).toBeLessThanOrEqual(AUDIO_MAX_BYTES);
    expect(inspectWav(b).frames).toBe(rate * 300);
    expect(() => inspectWav(wav(rate, rate * 300 + 1))).toThrow();
  }
});
it('direct mono avoids the stereo copy without changing a single PCM value', () => {
  for (const rate of [44100, 48000]) {
    const b = wav(rate, 65536),
      v = new DataView(b);
    for (let i = 0; i < 65536; i++) {
      v.setInt16(44 + i * 4, i - 32768, true);
      v.setInt16(46 + i * 4, 32767 - i, true);
    }
    const before = b.slice(0),
      old = toMono(parseWav(b)),
      next = parseWavMono(b);
    expect(next.samples).toEqual(old);
    expect(b).toEqual(before);
    expect(next.frames).toBe(65536);
    expect(next.sampleRate).toBe(rate);
  }
});
it('retains malformed/truncated/noncanonical WAV rejection', () => {
  const b = wav(48000, 100);
  for (const edit of [
    (v: DataView) => v.setUint16(22, 1, true),
    (v: DataView) => v.setUint32(24, 96000, true),
    (v: DataView) => v.setUint16(34, 24, true),
    (v: DataView) => v.setUint32(40, 401, true),
  ]) {
    const x = b.slice(0);
    edit(new DataView(x));
    expect(() => inspectWav(x)).toThrow();
  }
  expect(() => inspectWav(b.slice(0, -1))).toThrow();
});
