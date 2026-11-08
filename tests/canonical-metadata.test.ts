import { it, expect, vi, afterEach } from 'vitest';
import {
  readCanonicalMetadata,
  validCanonicalMetadata,
} from '../src/canonical-metadata-api';
import type { SourceRecord } from '../src/external-source';
const record = {
  videoId: 'AAAAAAAAAAA',
  audioSha256: 'a'.repeat(64),
  chartSetSha256: 'b'.repeat(64),
} as SourceRecord;
const meta = {
  ...record,
  title: 'A song',
  author: 'An artist',
  durationSec: 173,
  source: 'audio-manifest',
};
afterEach(() => vi.unstubAllGlobals());
it('accepts exact identity and rejects wrong or unsafe display metadata', () => {
  expect(validCanonicalMetadata(meta, record)).toBe(true);
  for (const [k, v] of [
    ['videoId', 'BBBBBBBBBBB'],
    ['audioSha256', 'c'.repeat(64)],
    ['chartSetSha256', 'd'.repeat(64)],
    ['source', 'other'],
    ['title', ''],
    ['title', 'x'.repeat(301)],
    ['title', 'x\n'],
    ['author', 'x'.repeat(201)],
    ['durationSec', 301],
  ])
    expect(validCanonicalMetadata({ ...meta, [k]: v }, record)).toBe(false);
});
it('GET only, unavailable remains optional and bounded', async () => {
  for (const status of [404, 409, 503]) {
    const fetch = vi.fn(async () => new Response('{}', { status }));
    vi.stubGlobal('fetch', fetch);
    expect(await readCanonicalMetadata(record)).toBeNull();
    expect(fetch.mock.calls).toHaveLength(1);
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('x'.repeat(9000))),
  );
  expect(await readCanonicalMetadata(record)).toBeNull();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(meta))),
  );
  expect(await readCanonicalMetadata(record)).toEqual(meta);
});
