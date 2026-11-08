import { difficultyForChart } from './chart-difficulty';
import { parseWav, toMono, resampleLinear } from './canonical-pcm.mjs';
import { analyzePcm } from './sample-analyzer.mjs';
import { generateC3Runtime } from './c3-runtime-research';
import {
  verifyChartHashes,
  chartSetHash,
  type SourceRecord,
} from './external-source';
/** New-source creation only. Saved charts are read from the store, never regenerated here. */
export async function generateSourceRecord(
  bytes: ArrayBuffer,
  videoId: string,
  audioSha256: string,
): Promise<SourceRecord> {
  const actual = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  if (actual !== audioSha256) throw Error('Source audio integrity failed');
  const parsed = parseWav(bytes),
    samples = resampleLinear(toMono(parsed), parsed.sampleRate, 22050),
    generated = generateC3Runtime(samples, 22050, 'c2'),
    // BPM remains a source summary, never a grid for the new note times.
    summary = analyzePcm(samples, 22050);
  const charts = {} as SourceRecord['charts'];
  const chartMetadata: SourceRecord['chartMetadata'] = {};
  for (const lanes of [5, 7] as const)
    for (const difficulty of ['low', 'mid', 'high', 'sc'] as const) {
      const notes = generated.charts[`${lanes}:${difficulty}`];
      if (
        difficulty === 'sc' &&
        JSON.stringify(notes) ===
          JSON.stringify(generated.charts[`${lanes}:high`])
      )
        continue;
      chartMetadata[`${lanes}:${difficulty}`] = difficultyForChart(
        notes,
        generated.duration,
        `${lanes}:${difficulty}`,
      );
      const data = new TextEncoder().encode(JSON.stringify(notes)),
        sha256 = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', data)),
          (b) => b.toString(16).padStart(2, '0'),
        ).join('');
      charts[`${lanes}:${difficulty}`] = { notes, sha256 };
    }
  const record: SourceRecord = {
    version: 1,
    videoId,
    audioSha256,
    sampleRate: parsed.sampleRate,
    estimatedBpm: summary.bpm,
    frames: parsed.frames,
    pipelineVersion: 'pcm16-stereo44100-48000-linear-v1',
    analyzerVersion: generated.analyzerVersion,
    config: JSON.stringify({
      mono: 'left-to-right-mean',
      analysisSampleRate: 22050,
      hop: 512,
      window: 1024,
      onset: 'table-stft-band-flux-c2',
      selection: 'nested-c2-high-gap0.10-burst8',
      grid: 'none',
      decoration: 'm17c-band-sustain-hold-chord-tail20',
      tailClipMargin: 0.2,
      lanePlacement: 'shared-union-v3-gap0.15',
      highMode: 'c2',
      sc: 'a4-sc-chordcap30-hold-emphasis-v1',
    }),
    charts,
    chartMetadata,
  };
  record.chartSetSha256 = await chartSetHash(record);
  if (!(await verifyChartHashes(record)))
    throw Error('Invalid generated chart');
  return record;
}
