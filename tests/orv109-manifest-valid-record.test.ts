import { expect, test } from 'vitest';
import { makePcm16StereoWav } from './youtube-direct-fixture';
import {
  generateLocalAllKeysRecord,
  validateLocalAllKeysRecord,
  localAllKeysIdentity,
} from '../src/local-allkeys-record';
import { verifyLocalAllKeysReplay } from '../src/local-allkeys-replay';
import type { RuntimeReplay } from '../src/replay';
import * as segments from '../src/progressive/segments';
import * as trust from '../src/progressive/manifest-trust';
import { inspectWav } from '../src/canonical-pcm.mjs';
// @ts-ignore Research-only utility outside the production source tree.
import { manifestTools } from './support/orv109-progressive-manifest.mjs';

test('validated twenty-chart record and verified replay survive local manifest preparation', async () => {
  // Generation is test-fixture setup ONLY; manifest preparation receives frozen data.
  const frames = 12 * 48000;
  const samples = new Int16Array(frames * 2);
  for (let frame = 0; frame < frames; frame++) {
    const time = (frame % 19200) / 48000;
    const sample = Math.round(
      16000 * Math.exp(-time * 40) * Math.sin(2 * Math.PI * 220 * time),
    );
    samples[frame * 2] = samples[frame * 2 + 1] = sample;
  }
  const { bytes } = makePcm16StereoWav({ sampleRate: 48000, frames, samples });
  const wav = bytes.buffer as ArrayBuffer;
  const envelope = await validateLocalAllKeysRecord(
    await generateLocalAllKeysRecord({ bytes: wav, videoId: 'AAAAAAAAAAA' }),
  );
  const identity = localAllKeysIdentity(envelope);
  const recordJson = JSON.stringify(envelope);
  const wavCopy = bytes.slice();
  const replay: RuntimeReplay = {
    version: 1,
    song: identity,
    lanes: 4,
    difficulty: 'low',
    options: { speed: 3, fader: 'off', shuffle: 'off', seed: 0 },
    ops: [[3, 0, 0, 4, 'off'], [1, 100, 9999]],
    end: 100,
  };
  const replayJson = JSON.stringify(replay);
  const before = await verifyLocalAllKeysReplay(envelope, replay);
  const tools = manifestTools({ ...segments, ...trust, inspectWav });
  let preparations = 0;
  async function prepareValidated(raw: unknown) {
    const validated = await validateLocalAllKeysRecord(raw);
    preparations++;
    return tools.prepare(wav, validated.record, validated.record.videoId);
  }
  const { manifest, pin } = await prepareValidated(envelope);
  const after = await verifyLocalAllKeysReplay(envelope, replay);
  expect(after).toEqual(before);
  expect(after.frozenNotes).toEqual(before.frozenNotes);
  expect(JSON.stringify(envelope)).toBe(recordJson);
  expect(JSON.stringify(replay)).toBe(replayJson);
  expect(localAllKeysIdentity(envelope)).toBe(identity);
  expect(Object.keys(envelope.record.charts)).toHaveLength(20);
  expect(bytes).toEqual(wavCopy);
  expect(envelope.record).not.toHaveProperty('manifestSha256');
  expect(envelope).not.toHaveProperty('manifest');
  expect(pin.audioSha256).toBe(envelope.record.audioSha256);
  expect(pin.chartSetSha256).toBe(envelope.record.chartSetSha256);
  segments.validateManifest(manifest, envelope.record);
  expect(await trust.checkManifestBinding(manifest, pin)).toBe('verified');
  expect(manifest.parts).toHaveLength(6);
  for (const part of manifest.parts) expect(part).not.toHaveProperty('bytes');
  // Existing full-record validator rejects corrupt charts before utility/audio work.
  const tampered = structuredClone(envelope);
  tampered.record.charts['4:low'].notes[0].time = -1;
  await expect(prepareValidated(tampered)).rejects.toThrow();
  expect(preparations).toBe(1);
  // A separate commitment must not silently become a private old-schema field.
  await expect(validateLocalAllKeysRecord({
    ...envelope, record: { ...envelope.record, manifestSha256: pin.manifestSha256 },
  })).rejects.toThrow();
}, 30_000);
