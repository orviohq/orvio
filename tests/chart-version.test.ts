import { it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  chartSetHash,
  verifyChartHashes,
  recordKey,
  type SourceRecord,
} from '../src/external-source';
import { sourceId, sourceAudioId } from '../src/external-catalog';
import { regenerationLabels } from '../src/regeneration-labels';
import { LANGUAGES } from '../src/i18n';
function fixture(): SourceRecord {
  const notes = [{ id: 0, time: 1, lane: 0 }];
  const sha256 = createHash('sha256')
    .update(JSON.stringify(notes))
    .digest('hex');
  return {
    version: 1,
    videoId: 'uXn-zOt68V8',
    audioSha256: 'a'.repeat(64),
    sampleRate: 48000,
    frames: 48000 * 8,
    estimatedBpm: 110,
    pipelineVersion: 'pcm-v1',
    analyzerVersion: 'old',
    config: '{}',
    charts: Object.fromEntries(
      ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
        k,
        { notes, sha256 },
      ]),
    ) as SourceRecord['charts'],
  };
}
it('keeps exact legacy IDs while versioning charts independently from reusable audio', async () => {
  const old = fixture(),
    current = structuredClone(old);
  current.analyzerVersion = 'new';
  current.chartSetSha256 = await chartSetHash(current);
  expect(recordKey(old)).toBe(old.videoId + ':' + old.audioSha256);
  expect(sourceId(old)).toBe('yt-uXn-zOt68V8-' + old.audioSha256.slice(0, 16));
  expect(recordKey(current)).not.toBe(recordKey(old));
  expect(sourceId(current)).not.toBe(sourceId(old));
  expect(sourceAudioId(current)).toBe(sourceAudioId(old));
  expect(await verifyChartHashes(old)).toBe(true);
  expect(await verifyChartHashes(current)).toBe(true);
  expect(await chartSetHash(structuredClone(current))).toBe(
    current.chartSetSha256,
  );
});
it('rejects forged version identities and changes to analyzer, config, or notes', async () => {
  const r = fixture();
  r.chartSetSha256 = await chartSetHash(r);
  for (const edit of [
    (x: SourceRecord) => (x.chartSetSha256 = 'b'.repeat(64)),
    (x: SourceRecord) => (x.analyzerVersion = 'changed'),
    (x: SourceRecord) => (x.config = 'different'),
    (x: SourceRecord) => (x.charts['5:high'].notes[0].time = 2),
  ]) {
    const c = structuredClone(r);
    edit(c);
    expect(await verifyChartHashes(c)).toBe(false);
  }
});
it('has nonempty player labels for every supported language', () => {
  for (const l of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[])
    for (const value of Object.values(regenerationLabels(l)))
      expect(value.length).toBeGreaterThan(0);
});
