import { it, expect } from 'vitest';
import { createLegacyMetadataAttemptGate } from '../src/opus/opus468-legacy-metadata-attempt';

it('skips stationary retries and allows only new navigation/href or explicit clear', () => {
  const gate = createLegacyMetadataAttemptGate();
  expect(gate.shouldAttempt('k', 1, '/select?x=1')).toBe(true);
  expect(gate.shouldAttempt('k', 1, '/select?x=1')).toBe(false);
  expect(gate.shouldAttempt('k', 2, '/select?x=1')).toBe(true);
  expect(gate.shouldAttempt('k', 2, '/select?x=2')).toBe(true);
  expect(gate.shouldAttempt('k', 2, '/select?x=2')).toBe(false);
  gate.clear('k');
  expect(gate.shouldAttempt('k', 2, '/select?x=2')).toBe(true);
});
