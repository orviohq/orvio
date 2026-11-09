import { it, expect } from 'vitest';
import fs from 'node:fs';
import { generateRecordFromAnalysis } from '../src/current35-budget-v1.mjs';
import { decodeVerifiedOpus } from '../src/opus-codec/verified-opus-client.mjs';
import { parsePinnedPcmAnalysis } from '../src/opus/opus-pcm-analysis.mjs';
// Freeze the old extra-STFT call shape, not a second copy of the large generator.
const source = fs.readFileSync(
  new URL('../test-support/unified/current35-reference.mjs', import.meta.url),
  'utf8',
);
const oldSource = source
  .replace("import { parseWavAnalysis } from './fused-resampler.mjs';", '')
  .replace(/export /g, '')
  .replace(
    'analyzePcm2(samples, rate, analysis)',
    'analyzePcm2(samples, rate)',
  );
const original = new Function(
  'parseWavAnalysis',
  oldSource + '; return generateRecordFromAnalysis;',
)(() => {
  throw Error('Unexpected WAV path');
});
it('shared flux keeps all record bytes identical to the separate pass across signals', async () => {
  for (const kind of ['silence', 'impulse', 'sweep', 'noise']) {
    let seed = 1234567;
    const samples = Float32Array.from({ length: 22050 * 12 }, (_, i) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      if (kind === 'silence') return 0;
      if (kind === 'impulse') return i % 11025 < 150 ? Math.sin(i * 0.3) : 0;
      if (kind === 'sweep')
        return Math.sin(i * i * 0.000001) * ((i % 15000) / 15000);
      return (seed / 4294967296 - 0.5) * (i % 11025 < 2000 ? 0.9 : 0.04);
    });
    const input = { samples, sampleRate: 48000, frames: 48000 * 12 };
    const run = async (fn: typeof generateRecordFromAnalysis) => {
      try {
        return { record: await fn(input, 'SYNTH000001', 'a'.repeat(64)) };
      } catch (error) {
        return { error: String(error) };
      }
    };
    expect(await run(generateRecordFromAnalysis)).toEqual(await run(original));
  }
});
it('real pinned decode preserves the existing complete frost record and all chart hashes', async () => {
  const root = new URL('../test-support/opus35-frost/', import.meta.url);
  const descriptor = JSON.parse(
    fs.readFileSync(new URL('descriptor.json', root), 'utf8'),
  );
  const decoded = await decodeVerifiedOpus({
    bytes: new Uint8Array(fs.readFileSync(new URL('audio.ogg', root))),
    wasmBytes: new Uint8Array(
      fs.readFileSync(
        new URL('../src/opus-codec/opus-decoder.wasm', import.meta.url),
      ),
    ),
    expected: descriptor,
  });
  const parsed = parsePinnedPcmAnalysis(decoded.pcm16, decoded.frames);
  const actual = await generateRecordFromAnalysis(
    parsed,
    descriptor.videoId,
    descriptor.pcm16Sha256,
  );
  const old = await original(
    parsed,
    descriptor.videoId,
    descriptor.pcm16Sha256,
  );
  expect(JSON.stringify(actual)).toBe(JSON.stringify(old));
  const frozen = JSON.parse(
    fs.readFileSync(new URL('record.json', root), 'utf8'),
  );
  expect(actual.charts).toEqual(frozen.charts);
  expect(actual.chartMetadata).toEqual(frozen.chartMetadata);
  expect(actual.chartSetSha256).toBe(frozen.chartSetSha256);
});
