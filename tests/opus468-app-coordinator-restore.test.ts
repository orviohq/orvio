import { it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';

const cache = vi.hoisted(() => ({
  readVerifiedOpusByRoots: vi.fn(async () => null),
}));
const canonical = vi.hoisted(() => ({
  calls: [] as any[],
  result: new ArrayBuffer(0),
}));
const metadata = vi.hoisted(() => ({
  calls: [] as any[],
}));

vi.mock('../src/opus/opus-cache.mjs', () => ({
  readVerifiedOpusByRoots: cache.readVerifiedOpusByRoots,
}));
vi.mock('../src/opus/opus35-api', () => ({
  restoreOpus35Record: async (...args: any[]) => {
    canonical.calls.push(args);
    return canonical.result;
  },
}));
vi.mock('../src/opus/opus468-source-metadata', () => ({
  readOpus468SourceMetadata: async (...args: any[]) => {
    metadata.calls.push(args);
    return { title: 'restored' };
  },
}));

import { createOpus468AppCoordinator } from '../src/opus/opus468-app-coordinator';

const record = JSON.parse(
  fs.readFileSync(
    new URL('../test-support/real3Ihr1016/base-record.raw.json', import.meta.url),
    'utf8',
  ),
);
const selection = { lanes: 4, difficulty: 'low' } as const;

beforeEach(() => {
  cache.readVerifiedOpusByRoots.mockClear();
  canonical.calls.length = 0;
  metadata.calls.length = 0;
});

function runtime(extra: any = {}) {
  return {
    extendCachedBase: vi.fn(async () => ({
      song: { id: 'song' },
      localPinCommitted: true,
    })),
    ...extra,
  };
}

it('cache miss calls the optional build-owned restore capability and never canonical transport', async () => {
  const restoreCalls: any[] = [];
  const r = runtime({
    restoreSourceRecord: vi.fn(async (input: any, options: any) => {
      restoreCalls.push({ input, options });
      return new ArrayBuffer(0);
    }),
  });
  const result = await createOpus468AppCoordinator(r as any).extend(record, selection, {
    signal: new AbortController().signal,
  });
  expect(result.song.id).toBe('song');
  expect(r.restoreSourceRecord).toHaveBeenCalledOnce();
  expect(restoreCalls[0].input).toEqual(record);
  expect(restoreCalls[0].options.signal).toBeInstanceOf(AbortSignal);
  expect(canonical.calls).toHaveLength(0);
  expect(r.extendCachedBase).toHaveBeenCalledOnce();
});

it('a restore capability error propagates and never reaches normal provider/extend', async () => {
  const r = runtime({
    restoreSourceRecord: vi.fn(async () => {
      throw Error('legacy restore boom');
    }),
  });
  await expect(
    createOpus468AppCoordinator(r as any).extend(record, selection, {
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('legacy restore boom');
  expect(canonical.calls).toHaveLength(0);
  expect(r.extendCachedBase).not.toHaveBeenCalled();
});

it('canonical fallback is used only when the build-owned method is absent', async () => {
  const r = runtime();
  await createOpus468AppCoordinator(r as any).extend(record, selection, {
    signal: new AbortController().signal,
  });
  expect(canonical.calls).toHaveLength(1);
  expect(canonical.calls[0][0]).toEqual(record);
  expect(r.extendCachedBase).toHaveBeenCalledOnce();
});
