import { it, expect, vi, afterEach } from 'vitest';
vi.mock('../src/canonical-source-api', () => ({
  readCanonicalSource: vi.fn(),
}));
vi.mock('../src/canonical-metadata-api', () => ({
  readCanonicalMetadata: vi.fn(),
}));
vi.mock('../src/canonical-library', () => ({ rememberCanonical: vi.fn() }));
vi.mock('../src/external-local', () => ({ saveSongMetadata: vi.fn() }));
import { readCanonicalSource } from '../src/canonical-source-api';
import { readCanonicalMetadata } from '../src/canonical-metadata-api';
import { rememberCanonical } from '../src/canonical-library';
import {
  songShareFragment,
  parseSongShare,
  createSongLink,
  inspectSongLink,
} from '../src/song-share';
import type { SourceRecord } from '../src/external-source';
const identity = {
  videoId: 'ekr2nIex040',
  audioSha256: 'a'.repeat(64),
  chartSetSha256: 'b'.repeat(64),
  recordSha256: 'c'.repeat(64),
};
const record = { ...identity } as unknown as SourceRecord;
afterEach(() => vi.resetAllMocks());
it('roundtrips only public song identities, with no user/replay/title/job data', () => {
  const fragment = songShareFragment(identity);
  expect(parseSongShare(fragment)).toEqual(identity);
  expect([...new URLSearchParams(fragment).keys()]).toEqual([
    'v',
    'video',
    'audio',
    'chart',
    'record',
  ]);
  for (const bad of [
    fragment + '&v=1',
    fragment + '&title=private',
    fragment.replace('v=1', 'v=5'),
    fragment.replace('audio=a', 'audio=Z'),
    '',
    'x'.repeat(301),
  ])
    expect(() => parseSongShare(bad)).toThrow();
});
it('sender only reads canonical and refuses changing archive identities', async () => {
  vi.mocked(readCanonicalSource).mockResolvedValue({
    state: 'ready',
    record,
    recordSha256: identity.recordSha256,
    audioCached: true,
  });
  const url = await createSongLink(record, 'https://example.test');
  expect(new URL(url).pathname).toBe('/song/');
  expect(parseSongShare(new URL(url).hash)).toEqual(identity);
  expect(rememberCanonical).not.toHaveBeenCalled();
  vi.mocked(readCanonicalSource).mockResolvedValue({
    state: 'ready',
    record: { ...record, audioSha256: 'd'.repeat(64) },
    recordSha256: identity.recordSha256,
    audioCached: true,
  });
  await expect(
    createSongLink(record, 'https://example.test'),
  ).rejects.toThrow();
});
it('recipient inspection never pins; pending/missing/hash mismatch fail closed', async () => {
  for (const state of ['missing', 'pending'] as const) {
    vi.mocked(readCanonicalSource).mockResolvedValue(
      state === 'missing' ? { state } : { state, retryAfterSec: 15 },
    );
    await expect(
      inspectSongLink(identity, new AbortController().signal),
    ).rejects.toThrow();
  }
  vi.mocked(readCanonicalSource).mockResolvedValue({
    state: 'ready',
    record,
    recordSha256: 'd'.repeat(64),
    audioCached: true,
  });
  await expect(
    inspectSongLink(identity, new AbortController().signal),
  ).rejects.toThrow('changed');
  vi.mocked(readCanonicalSource).mockResolvedValue({
    state: 'ready',
    record,
    recordSha256: identity.recordSha256,
    audioCached: true,
  });
  vi.mocked(readCanonicalMetadata).mockResolvedValue(null);
  await expect(
    inspectSongLink(identity, new AbortController().signal),
  ).rejects.toThrow('metadata');
  expect(rememberCanonical).not.toHaveBeenCalled();
});
