import { it, expect, vi, afterEach } from 'vitest';
import { resolveYoutubeChannel } from '../src/youtube-channel-recovery';
import { readCanonicalMetadata } from '../src/canonical-metadata-api';
import { earlyYoutubeMetadata } from '../src/early-youtube-metadata';
import type { SourceRecord } from '../src/external-source';
import type { OpusRecord } from '../src/opus/opus-record';
import type { PlayableSourceRecord } from '../src/playable-source';
import { queryClient } from '../src/query-client';

const videoId = 'AAAAAAAAAAA';
const legacy = {
  videoId,
  audioSha256: 'a'.repeat(64),
  chartSetSha256: 'b'.repeat(64),
} as SourceRecord;
const opus = { ...legacy, version: 2 } as unknown as OpusRecord;
const canonical = {
  ...legacy,
  title: 'A song',
  author: 'Canonical Channel',
  durationSec: 173,
  source: 'audio-manifest' as const,
};
const oembed = {
  videoId,
  title: 'A song',
  author: 'Oembed Channel',
  thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  source: 'youtube-oembed' as const,
};
const readers = {
  canonical: (record: PlayableSourceRecord) =>
    readCanonicalMetadata(record as SourceRecord),
  oembed: earlyYoutubeMetadata,
};
const fetchUrl = (input: string | URL | Request) => String(input);
const stubFetch = (handle: (url: string) => Response | Promise<Response>) => {
  const fetch = vi.fn(async (input: string | URL | Request) =>
    handle(fetchUrl(input)),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
};
// The ORV-62 query cache persists successes across calls by design; tests
// that re-stub fetch scenarios must start from an empty cache.
afterEach(() => {
  vi.unstubAllGlobals();
  queryClient.clear();
});
it('prefers the canonical identity-bound author without reading oembed', async () => {
  const fetch = stubFetch((url) =>
    Response.json(url.includes('/youtube-metadata/') ? oembed : canonical),
  );
  expect(await resolveYoutubeChannel(legacy, readers)).toBe(
    'Canonical Channel',
  );
  expect(fetch.mock.calls.map(([url]) => fetchUrl(url))).not.toContainEqual(
    expect.stringContaining('/youtube-metadata/'),
  );
});
it('falls back to the oembed author when the canonical author is null or missing', async () => {
  const { author: _author, ...canonicalWithoutAuthor } = canonical;
  for (const body of [{ ...canonical, author: null }, canonicalWithoutAuthor]) {
    const fetch = stubFetch((url) =>
      Response.json(url.includes('/youtube-metadata/') ? oembed : body),
    );
    expect(await resolveYoutubeChannel(legacy, readers)).toBe('Oembed Channel');
    expect(fetch.mock.calls.map(([url]) => fetchUrl(url))).toContainEqual(
      expect.stringContaining('/youtube-metadata/' + videoId),
    );
    queryClient.clear();
    vi.unstubAllGlobals();
  }
});
it('resolves to null when neither source has a channel name', async () => {
  stubFetch((url) =>
    Response.json(
      url.includes('/youtube-metadata/')
        ? { ...oembed, author: null }
        : { ...canonical, author: null },
    ),
  );
  expect(await resolveYoutubeChannel(legacy, readers)).toBeNull();
});
it('uses the oembed path for opus records and never reads canonical metadata', async () => {
  const fetch = stubFetch((url) => {
    if (url.includes('/chart-sources/'))
      throw Error('canonical must be skipped');
    return Response.json(oembed);
  });
  expect(await resolveYoutubeChannel(opus, readers)).toBe('Oembed Channel');
  expect(fetch.mock.calls.map(([url]) => fetchUrl(url))).toEqual([
    expect.stringContaining('/youtube-metadata/' + videoId),
  ]);
});
it('keeps a failed or invalid oembed read nonfatal', async () => {
  for (const fetch of [
    async () => new Response('{}', { status: 503 }),
    async () =>
      new Response(
        JSON.stringify({ ...oembed, thumbnailUrl: 'https://evil.example/x' }),
      ),
    async () => {
      throw Error('network');
    },
  ]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) =>
        fetchUrl(input).includes('/youtube-metadata/')
          ? fetch()
          : Response.json({ ...canonical, author: null }),
      ),
    );
    expect(await resolveYoutubeChannel(legacy, readers)).toBeNull();
    queryClient.clear();
    vi.unstubAllGlobals();
  }
});
it('falls through to oembed when the canonical reader rejects', async () => {
  expect(
    await resolveYoutubeChannel(legacy, {
      canonical: async () => {
        throw Error('unavailable');
      },
      oembed: async () => oembed,
    }),
  ).toBe('Oembed Channel');
});
