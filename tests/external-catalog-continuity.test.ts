import { it, expect } from 'vitest';
import { installExternalSource } from '../src/external-catalog';
import type { SourceRecord } from '../src/external-source';
it('keeps source and song references, bytes, author and useful title through repeated ID-only pin installs', () => {
  const record = {
    version: 1,
    videoId: 'CCCCCCCCCCC',
    audioSha256: 'c'.repeat(64),
    chartSetSha256: 'd'.repeat(64),
    frames: 48000,
    sampleRate: 48000,
  } as SourceRecord;
  const bytes = new ArrayBuffer(4);
  const original = installExternalSource(
    record,
    'Verified share title',
    bytes,
    'known-job',
    'Known Artist',
  );
  const reload = installExternalSource(structuredClone(record), record.videoId);
  expect(reload).toBe(original);
  expect(reload.song).toBe(original.song);
  expect(reload.record).toBe(record);
  expect(reload.bytes).toBe(bytes);
  expect(reload.jobId).toBe('known-job');
  expect(reload.song.title).toBe('Verified share title');
  expect(reload.song.subtitle).toBe('Known Artist');
  const update = installExternalSource(record, 'Fresh verified title');
  expect(update.song).toBe(original.song);
  expect(original.song.title).toBe('Fresh verified title');
});
