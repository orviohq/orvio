import {
  generateLocalAllKeysRecord,
  localAllKeysIdentity,
  validateLocalAllKeysRecord,
  type LocalAllKeysEnvelope,
} from "../src/local-allkeys-record";
import { makePcm16StereoWav } from "./youtube-direct-fixture";

/** Fresh synthetic pulses, generated in memory; no recorded audio or saved charts. */
export async function makeLocalAllKeysCatalogFixture(): Promise<{
  identity: string;
  envelope: LocalAllKeysEnvelope;
}> {
  const sampleRate = 48000;
  const frames = 12 * sampleRate;
  const mono = new Float64Array(frames);
  for (let event = 0; event < 24; event++) {
    const start = Math.round((0.25 + event * 0.5) * sampleRate);
    const sustained = event % 4 === 0;
    const duration = sustained ? 0.85 : 0.12;
    const amplitude = sustained ? 12000 : 7000;
    const frequency = 180 + (event % 4) * 90;
    for (let offset = 0; offset < duration * sampleRate; offset++) {
      const time = offset / sampleRate;
      const envelope =
        Math.min(1, time / 0.005, (duration - time) / 0.04) *
        (sustained ? 1 : Math.exp(-30 * time));
      const phase = 2 * Math.PI * frequency * time;
      mono[start + offset] +=
        amplitude *
        envelope *
        (Math.sin(phase) + 0.3 * Math.sin(2 * phase) + 0.15 * Math.sin(3 * phase));
    }
  }
  const samples = new Int16Array(frames * 2);
  for (let frame = 0; frame < frames; frame++) {
    samples[frame * 2] = Math.round(mono[frame]);
    samples[frame * 2 + 1] = Math.round(mono[frame] * 0.8);
  }
  const { bytes } = makePcm16StereoWav({ sampleRate, frames, samples });
  const envelope = await validateLocalAllKeysRecord(
    await generateLocalAllKeysRecord({
      bytes: bytes.buffer as ArrayBuffer,
      videoId: "synthCat001",
    }),
  );
  return { identity: localAllKeysIdentity(envelope), envelope };
}
