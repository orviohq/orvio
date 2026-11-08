import { it, expect, vi, afterEach } from 'vitest';
import {
  earlyYoutubeMetadata,
  validEarlyMetadata,
} from '../src/early-youtube-metadata';
import { queryClient } from '../src/query-client';
const id = 'WGm2HmXeeRI',
  raw = {
    videoId: id,
    title: '<b>Literal title</b>',
    author: 'QWER',
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    source: 'youtube-oembed',
  };
// The ORV-62 query cache persists successes across calls by design; tests
// that re-stub fetch scenarios must start from an empty cache.
afterEach(() => {
  vi.unstubAllGlobals();
  queryClient.clear();
});
it('accepts bounded display metadata only with exact id/source/fixed thumbnail', () => {
  expect(validEarlyMetadata(raw, id)).toBe(true);
  for (const delta of [
    { videoId: 'BBBBBBBBBBB' },
    { source: 'canonical' },
    { title: 'x\n' },
    { title: 'x'.repeat(201) },
    { thumbnailUrl: 'https://evil.example/image' },
    { author: 'x'.repeat(101) },
  ])
    expect(validEarlyMetadata({ ...raw, ...delta }, id)).toBe(false);
});
it('GET only, unavailable and oversized metadata are nonfatal', async () => {
  const fetch = vi.fn(
    async (_input: string, _init?: RequestInit) =>
      new Response(JSON.stringify(raw)),
  );
  vi.stubGlobal('fetch', fetch);
  expect(await earlyYoutubeMetadata(id)).toEqual(raw);
  expect(fetch.mock.calls[0][0]).toContain('/v1/youtube-metadata/' + id);
  expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit' });
  queryClient.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 503 })),
  );
  expect(await earlyYoutubeMetadata(id)).toBeNull();
  queryClient.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('x'.repeat(17000))),
  );
  expect(await earlyYoutubeMetadata(id)).toBeNull();
});
