import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { generateRecordFromAnalysis } from '../src/chart-core/index.mjs';
async function instrument(reintroduceSeparatePass = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orvio-core-count-'));
  const src = path.resolve('src/chart-core');
  for (const name of ['index.mjs', 'all-keys.mjs', 'shared.mjs', 'tables.mjs'])
    fs.copyFileSync(path.join(src, name), path.join(root, name));
  let shared = fs.readFileSync(path.join(root, 'shared.mjs'), 'utf8');
  shared = shared
    .replace(
      'function fft2(re, im) {',
      'function fft2(re, im) {\n globalThis.__orvioFluxCount.v3++;',
    )
    .replace(
      'function fft3(re, im) {',
      'function fft3(re, im) {\n globalThis.__orvioFluxCount.v2++;',
    );
  fs.writeFileSync(path.join(root, 'shared.mjs'), shared);
  let entry = fs
    .readFileSync(path.join(root, 'all-keys.mjs'), 'utf8')
    .replace(
      "'@noble/hashes/sha2.js'",
      JSON.stringify(
        pathToFileURL(
          import.meta.resolve('@noble/hashes/sha2.js').replace('file://', ''),
        ).href,
      ),
    );
  if (reintroduceSeparatePass)
    entry = entry.replace(
      'analyzePcm2(samples, rate, analysis)',
      'analyzePcm2(samples, rate)',
    );
  fs.writeFileSync(path.join(root, 'all-keys.mjs'), entry);
  // Full copied ESM source is instrumented only in temporary test files.
  const module = await import(
    /* @vite-ignore */ pathToFileURL(path.join(root, 'index.mjs')).href
  );
  return {
    module,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}
it('serving core reuses one spectral analysis; injection reproduces duplicate-pass failure while outputs stay equal', async () => {
  const samples = Float32Array.from(
    { length: 22050 * 2 },
    (_, i) => Math.sin(i * 0.03) * (i % 11025 < 1800 ? 0.8 : 0.02),
  );
  const parsed = { samples, sampleRate: 48000, frames: 96000 };
  const actual = await instrument(),
    reverted = await instrument(true);
  try {
    const run = async (m: any, kind: string) => {
      (globalThis as any).__orvioFluxCount = { v3: 0, v2: 0 };
      const record =
        kind === '35'
          ? await m.generateRecordFromAnalysis(
              parsed,
              'SYNTH000001',
              'a'.repeat(64),
            )
          : m.generateUnifiedCharts(parsed, {
              lanes: [4, 6, 8],
              ...(kind === '468-serving' ? { instrument: false } : {}),
            });
      return { record, count: { ...(globalThis as any).__orvioFluxCount } };
    };
    for (const kind of ['35', '468-serving', '468-diagnostic-default']) {
      const good = await run(actual.module, kind),
        old = await run(reverted.module, kind);
      expect(good.count.v3).toBeGreaterThan(1);
      expect(good.count.v2).toBe(0);
      expect(old.count.v3).toBe(good.count.v3);
      expect(old.count.v2).toBe(good.count.v3);
      expect(old.count).not.toEqual(good.count);
      expect(good.record).toEqual(old.record);
      if (kind === '35')
        expect(good.record).toEqual(
          await generateRecordFromAnalysis(
            parsed,
            'SYNTH000001',
            'a'.repeat(64),
          ),
        );
    }
  } finally {
    actual.cleanup();
    reverted.cleanup();
    delete (globalThis as any).__orvioFluxCount;
  }
});
