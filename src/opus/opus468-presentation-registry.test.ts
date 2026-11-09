import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createVerifiedOpusPresentationRegistry } from './opus468-presentation-registry';
const record = JSON.parse(
  readFileSync('test-support/opus35-frost/record.json', 'utf8'),
);
it('verified explicit video binding snapshots record and cannot silently replace same song source', async () => {
  const r = createVerifiedOpusPresentationRegistry(),
    input = structuredClone(record);
  expect(r.videoId('ext')).toBeUndefined();
  expect(await r.attach('ext', input)).toBe(record.videoId);
  input.videoId = 'AAAAAAAAAAA';
  expect(r.videoId('ext')).toBe(record.videoId);
  await expect(
    r.attach('ext', { ...record, videoId: 'AAAAAAAAAAA' }),
  ).rejects.toThrow();
  await expect(
    r.attach('ext', { ...record, version: 1 } as any),
  ).rejects.toThrow('extension_presentation_source');
});
it('aborted and invalid input never bind display identity', async () => {
  const r = createVerifiedOpusPresentationRegistry(),
    c = new AbortController();
  c.abort(Error('cancelled'));
  await expect(r.attach('x', record, { signal: c.signal })).rejects.toThrow(
    'cancelled',
  );
  await expect(
    r.attach('x', { ...record, encodedAudioSha256: 'x' }),
  ).rejects.toThrow('extension_presentation_source');
  expect(r.videoId('x')).toBeUndefined();
});
