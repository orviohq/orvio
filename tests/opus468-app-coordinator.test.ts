import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('../src/opus/opus-cache.mjs', () => ({
  readVerifiedOpusByRoots: vi.fn(async () => ({})),
}));
vi.mock('../src/opus/opus35-api', () => ({
  restoreOpus35Record: vi.fn(async () => ({})),
}));
vi.mock('../src/opus/opus468-source-metadata', () => ({
  readOpus468SourceMetadata: vi.fn(async () => ({
    title: 'Bound title',
    author: 'Bound author',
  })),
}));
import { createOpus468AppCoordinator } from '../src/opus/opus468-app-coordinator';
import { readVerifiedOpusByRoots } from '../src/opus/opus-cache.mjs';
import { restoreOpus35Record } from '../src/opus/opus35-api';
const base = JSON.parse(
  readFileSync('test-support/opus35-frost/record.json', 'utf8'),
);
it('serialized work snapshots inputs, reuses verified encoded cache, preserves record-bound metadata', async () => {
  let release!: () => void,
    started = 0;
  const runtime = {
    extendCachedBase: vi.fn(async (input: any) => {
      started++;
      if (started === 1) await new Promise<void>((r) => (release = r));
      expect(input.metadata).toEqual({
        title: 'Bound title',
        author: 'Bound author',
      });
      return { song: { id: 'exact' }, localPinCommitted: true };
    }),
  };
  const c = createOpus468AppCoordinator(runtime),
    input = structuredClone(base);
  const a = c.extend(input, { lanes: 4, difficulty: 'low' }),
    b = c.extend(base, { lanes: 6, difficulty: 'mid' });
  input.videoId = 'AAAAAAAAAAA';
  await vi.waitFor(() => expect(started).toBe(1));
  release();
  await a;
  await b;
  expect(started).toBe(2);
  expect(runtime.extendCachedBase.mock.calls[0][0].baseRecord.videoId).toBe(
    base.videoId,
  );
  expect(restoreOpus35Record).not.toHaveBeenCalled();
});
it('missing cache uses exact stable restore, aborted/legacy inputs never reach producer', async () => {
  vi.mocked(readVerifiedOpusByRoots).mockResolvedValueOnce(null);
  const r = {
      extendCachedBase: vi.fn(async () => ({
        song: { id: 'exact' },
        localPinCommitted: true,
      })),
    },
    c = createOpus468AppCoordinator(r);
  await c.extend(base, { lanes: 4, difficulty: 'low' });
  expect(restoreOpus35Record).toHaveBeenCalledWith(
    base,
    expect.any(AbortSignal),
  );
  const abort = new AbortController();
  abort.abort(Error('stop'));
  await expect(
    c.extend(base, { lanes: 4, difficulty: 'low' }, { signal: abort.signal }),
  ).rejects.toThrow('stop');
  await expect(
    c.extend({ ...base, version: 1 }, { lanes: 4, difficulty: 'low' }),
  ).rejects.toThrow('extension_source_unavailable');
  expect(r.extendCachedBase).toHaveBeenCalledTimes(1);
});
