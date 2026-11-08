import { it, expect } from 'vitest';
import { fixture } from './external-share.test';
import { validSourceRecord, chartSetHash } from '../src/external-source';
import {
  encodeExternalShare,
  decodeExternalShare,
} from '../src/external-share';
it('optional anchor preserves legacy and exact v5 share transport', async () => {
  const data = await fixture();
  const old = JSON.stringify(data.record);
  const oldChart = await chartSetHash(data.record);
  expect(validSourceRecord(data.record)).toBe(true);
  const legacy = await decodeExternalShare(await encodeExternalShare(data));
  expect(JSON.stringify(legacy.record)).toBe(old);
  expect(legacy.record.manifestSha256).toBeUndefined();
  data.record.manifestSha256 = 'c'.repeat(64);
  expect(validSourceRecord(data.record)).toBe(true);
  expect(await chartSetHash(data.record)).toBe(oldChart);
  const next = await decodeExternalShare(await encodeExternalShare(data));
  expect(JSON.stringify(next.record)).toBe(JSON.stringify(data.record));
  expect(next.record.manifestSha256).toBe('c'.repeat(64));
});
it('malformed optional anchors fail validation rather than silently disappear', async () => {
  const data = await fixture();
  for (const invalid of [null, 42, '', 'ABC', 'C'.repeat(64)]) {
    expect(validSourceRecord({ ...data.record, manifestSha256: invalid })).toBe(
      false,
    );
  }
});
