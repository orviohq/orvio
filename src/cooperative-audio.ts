/** Yield while building an inaudible buffer. The caller owns the playback
 * anchor only after every sample is copied and its attempt is still current. */
export async function fillPcmAudioBuffer(
  context: BaseAudioContext,
  view: DataView,
  frames: number,
  channels: number,
  sampleRate: number,
  offset: number,
  signal?: AbortSignal,
): Promise<AudioBuffer> {
  signal?.throwIfAborted();
  const buffer = context.createBuffer(channels, frames, sampleRate),
    outputs = Array.from({ length: channels }, (_, ch) =>
      buffer.getChannelData(ch),
    );
  for (let start = 0; start < frames; start += 32768) {
    signal?.throwIfAborted();
    const end = Math.min(frames, start + 32768);
    for (let i = start; i < end; i++)
      for (let ch = 0; ch < channels; ch++)
        outputs[ch][i] =
          view.getInt16(offset + (i * channels + ch) * 2, true) / 32768;
    if (end < frames) {
      const scheduler = (
        globalThis as typeof globalThis & {
          scheduler?: { yield?: () => Promise<void> };
        }
      ).scheduler;
      if (scheduler?.yield) await scheduler.yield();
      else await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  signal?.throwIfAborted();
  return buffer;
}
