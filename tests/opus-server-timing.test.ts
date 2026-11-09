import { it, expect } from 'vitest';
import { traceOpusServerTiming } from '../src/opus/opus-server-timing';
import type { ImportTrace } from '../src/import-trace';
const trace = (): ImportTrace => ({ id: 1, startedAt: 0, events: [] });
it('records only the six fixed server timing labels with bounded numeric durations', () => {
  const t = trace();
  traceOpusServerTiming(
    t,
    'opus_provider_wait;dur=100.123, opus_source_collect;dur=200, opus_encode;dur=0, opus_staged_verify;dur=3.5, opus_kv_write;dur=4, opus_durable_verify;dur=5',
  );
  expect(t.events.map((e) => [e.stage, e.detail?.ms])).toEqual([
    ['backend-opus_provider_wait', 100.1],
    ['backend-opus_source_collect', 200],
    ['backend-opus_encode', 0],
    ['backend-opus_staged_verify', 3.5],
    ['backend-opus_kv_write', 4],
    ['backend-opus_durable_verify', 5],
  ]);
});
it('ignores arbitrary text, missing/lost headers, descriptions, invalid and repeated durations', () => {
  const t = trace();
  for (const value of [
    null,
    '',
    'opus_encode;dur=-1',
    'opus_encode;dur=NaN',
    'opus_encode;dur=Infinity',
    'opus_encode;dur=3600001',
    'opus_encode;dur=2;desc="secret"',
    'secret;dur=2',
    'opus_encode;dur=2\nsecret',
    'x'.repeat(4097),
  ])
    traceOpusServerTiming(t, value);
  expect(t.events).toEqual([]);
  traceOpusServerTiming(t, 'opus_encode;dur=2,opus_encode;dur=3');
  expect(t.events).toHaveLength(1);
  expect(t.events[0].detail?.ms).toBe(2);
});
