import { expect, test } from 'vitest';
import { fillPcmAudioBuffer } from '../src/cooperative-audio';
function context() {
  return {
    createBuffer(channels: number, frames: number, sampleRate: number) {
      const arrays = Array.from(
        { length: channels },
        () => new Float32Array(frames),
      );
      return {
        length: frames,
        numberOfChannels: channels,
        sampleRate,
        getChannelData: (ch: number) => arrays[ch],
      };
    },
  } as unknown as BaseAudioContext;
}
test('cooperative copies every PCM16 sample in exact channel order across batch boundaries', async () => {
  const frames = 100003,
    bytes = new ArrayBuffer(frames * 4 + 44),
    view = new DataView(bytes);
  for (let i = 0; i < frames * 2; i++)
    view.setInt16(44 + i * 2, ((i * 7919) % 65536) - 32768, true);
  const buffer = await fillPcmAudioBuffer(
    context(),
    view,
    frames,
    2,
    48000,
    44,
  );
  for (let i = 0; i < frames; i++)
    for (let ch = 0; ch < 2; ch++)
      expect(buffer.getChannelData(ch)[i]).toBe(
        view.getInt16(44 + (i * 2 + ch) * 2, true) / 32768,
      );
  expect(buffer.length).toBe(frames);
  expect(buffer.sampleRate).toBe(48000);
});
test('already-aborted assembly never allocates a playback buffer', async () => {
  const c = new AbortController();
  c.abort();
  await expect(
    fillPcmAudioBuffer(
      {
        createBuffer: () => {
          throw Error('must not allocate');
        },
      } as any,
      new DataView(new ArrayBuffer(4)),
      1,
      2,
      48000,
      0,
      c.signal,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
});
test('mid-assembly cancellation rejects rather than returning partial audio', async () => {
  const c = new AbortController(),
    frames = 100003;
  setTimeout(() => c.abort(), 0);
  await expect(
    fillPcmAudioBuffer(
      context(),
      new DataView(new ArrayBuffer(frames * 4)),
      frames,
      2,
      48000,
      0,
      c.signal,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
});
