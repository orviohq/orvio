import { it, expect, vi, afterEach } from 'vitest';
import {
  readCanonicalMetadata,
  validCanonicalMetadata,
} from '../src/canonical-metadata-api';
import type { SourceRecord } from '../src/external-source';
import { queryClient } from '../src/query-client';
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
// The ORV-62 query cache persists successes across calls by design; tests
// that re-stub fetch scenarios must start from an empty cache.
afterEach(() => {
  vi.unstubAllGlobals();
  queryClient.clear();
});
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
    ['author', undefined],
    ['author', 123],
    ['durationSec', 301],
  ] as [string, unknown][])
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

it('accepts explicit null author and normalizes blank author without inventing one', async () => {
  expect(validCanonicalMetadata({ ...meta, author: null }, record)).toBe(true);
  for (const author of [null, '', '  ']) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ...meta, author }))),
    );
    expect(await readCanonicalMetadata(record)).toEqual({
      ...meta,
      author: null,
    });
  }
});
