import { describe, it, expect } from 'vitest';
import {
  validSourceRecord,
  matchAudio,
  recordKey,
  type SourceRecord,
} from '../src/external-source';
function fixture(): SourceRecord {
  return {
    version: 1,
    videoId: 'uXn-zOt68V8',
    audioSha256: 'a'.repeat(64),
    estimatedBpm: 144,
    sampleRate: 44100,
    frames: 44100 * 125,
    pipelineVersion: 'pcm-v1',
    analyzerVersion: 'analyzer-v1',
    config: '{}',
    charts: Object.fromEntries(
      ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
        k,
        { notes: [{ id: 0, time: 1, lane: 0 }], sha256: 'b'.repeat(64) },
      ]),
    ) as SourceRecord['charts'],
  };
}
describe('external source pin contract', () => {
  it('requires all six mode charts and binds a source', () => {
    const r = fixture();
    expect(validSourceRecord(r)).toBe(true);
    expect(recordKey(r)).toBe('uXn-zOt68V8:' + r.audioSha256);
    delete (r.charts as Partial<SourceRecord['charts']>)['7:high'];
    expect(validSourceRecord(r)).toBe(false);
  });
  it('fails closed on source change without mutating the old chart', () => {
    const r = fixture(),
      before = JSON.stringify(r);
    expect(matchAudio(r, 'c'.repeat(64))).toBe('source-changed');
    expect(JSON.stringify(r)).toBe(before);
    expect(matchAudio(r, r.audioSha256)).toBe('exact');
  });
  it('rejects partial malformed or mismatched mode charts', () => {
    for (const edit of [
      (r: SourceRecord) => (r.charts['5:high'].notes[0].lane = 5),
      (r: SourceRecord) => (r.charts['7:high'].notes[0].time = 126),
      (r: SourceRecord) =>
        r.charts['5:low'].notes.push({ id: 0, time: 2, lane: 0 }),
      (r: SourceRecord) => (r.audioSha256 = 'bad'),
    ]) {
      const r = fixture();
      edit(r);
      expect(validSourceRecord(r)).toBe(false);
    }
  });
});
