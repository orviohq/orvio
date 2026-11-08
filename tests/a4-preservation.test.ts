import { it, expect } from 'vitest';
import { SONGS, makeChart, duration } from '../src/chart';
import {
  difficultyForChart,
  validDifficultyMetadata,
} from '../src/chart-difficulty';
import {
  validSourceRecord,
  chartSetHash,
  verifyChartHashes,
  type SourceRecord,
} from '../src/external-source';
import { createHash } from 'node:crypto';
it('legacy sixkey chart identity bytes stay unchanged, optionalSC is independent and hashbound', async () => {
  const notes = [{ id: 0, time: 1, lane: 0 }],
    sha256 = createHash('sha256').update(JSON.stringify(notes)).digest('hex');
  const r: SourceRecord = {
    version: 1,
    videoId: 'uXn-zOt68V8',
    audioSha256: 'a'.repeat(64),
    sampleRate: 48000,
    frames: 48000 * 8,
    estimatedBpm: 110,
    pipelineVersion: 'old',
    analyzerVersion: 'old',
    config: '{}',
    charts: Object.fromEntries(
      ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
        k,
        { notes, sha256 },
      ]),
    ) as SourceRecord['charts'],
  };
  const legacy = JSON.stringify({
    analyzer: r.analyzerVersion,
    config: r.config,
    charts: ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map(
      (k) => [k, sha256],
    ),
  });
  expect(await chartSetHash(r)).toBe(
    createHash('sha256').update(legacy).digest('hex'),
  );
  r.chartSetSha256 = await chartSetHash(r);
  expect(await verifyChartHashes(r)).toBe(true);
  const next = structuredClone(r);
  next.charts['5:sc'] = {
    notes: [{ id: 0, time: 2, lane: 0 }],
    sha256: createHash('sha256')
      .update(JSON.stringify([{ id: 0, time: 2, lane: 0 }]))
      .digest('hex'),
  };
  next.chartSetSha256 = await chartSetHash(next);
  expect(next.chartSetSha256).not.toBe(r.chartSetSha256);
  expect(await verifyChartHashes(next)).toBe(true);
  next.charts['5:sc'].notes[0].time = 3;
  expect(await verifyChartHashes(next)).toBe(false);
  expect(validSourceRecord(r)).toBe(true);
});
it('allbuiltin SC arrangements are real and ratings deterministic with separate scale', () => {
  for (const song of SONGS)
    for (const lanes of [5, 7] as const) {
      const sc = makeChart(song, 'sc', lanes),
        mx = makeChart(song, 'high', lanes);
      expect(sc).not.toEqual(mx);
      expect(sc.length).toBeGreaterThan(mx.length);
      const m = difficultyForChart(sc, duration(song), `${lanes}:sc`);
      expect(validDifficultyMetadata(m)).toBe(true);
      expect(m.family).toBe('SC');
      expect(m.rating?.scale).toBe('sc');
      expect(m).toEqual(difficultyForChart(sc, duration(song), `${lanes}:sc`));
    }
});
