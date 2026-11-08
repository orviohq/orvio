import { it, expect, vi, afterEach } from 'vitest';
import type { SourceRecord } from '../src/external-source';
const stores = vi.hoisted(() => ({ records: new Map<string, SourceRecord>() }));
vi.mock('../src/external-source-store', () => ({
  pinSource: vi.fn(async (r: SourceRecord) => {
    stores.records.set(r.videoId, structuredClone(r));
  }),
  readPinnedSource: vi.fn(async (v: string) => stores.records.get(v) ?? null),
}));
import { rememberCanonical, savedCanonical } from '../src/canonical-library';
function setup() {
  const rows = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => rows.get(k) ?? null,
    setItem: (k: string, v: string) => rows.set(k, v),
  });
  return rows;
}
function record() {
  return {
    videoId: 'ImuWa3SJulY',
    audioSha256: 'a'.repeat(64),
    chartSetSha256: 'b'.repeat(64),
    charts: {},
    config: '{}',
  } as unknown as SourceRecord;
}
afterEach(() => {
  stores.records.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it('preserves a verified record across cache reload even when server raw JSON has whitespace', async () => {
  setup();
  const r = record();
  await rememberCanonical(r, 'c'.repeat(64));
  expect(await savedCanonical(r.videoId)).toEqual(r);
});
it('rejects identity replacement before writing the immutable pin', async () => {
  setup();
  const r = record();
  await rememberCanonical(r, 'c'.repeat(64));
  const next = { ...r, audioSha256: 'd'.repeat(64) };
  await expect(rememberCanonical(next, 'e'.repeat(64))).rejects.toThrow(
    'identity changed',
  );
  expect(stores.records.get(r.videoId)).toEqual(r);
});
it('local corruption fails closed without generating or rewriting', async () => {
  setup();
  const r = record();
  await rememberCanonical(r, 'c'.repeat(64));
  stores.records.get(r.videoId)!.config = 'changed';
  await expect(savedCanonical(r.videoId)).rejects.toThrow('integrity');
});
it('a corrupt or old unverified reference cannot grant canonical identity', async () => {
  const rows = setup();
  rows.set(
    'orvio.canonical-library.v1',
    JSON.stringify([{ ...record(), recordSha256: 'c'.repeat(64) }]),
  );
  expect(await savedCanonical('ImuWa3SJulY')).toBeNull();
});
it('storage failure never gives a usable local canonical reference', async () => {
  setup();
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {
      throw Error('blocked');
    },
  });
  await expect(rememberCanonical(record(), 'c'.repeat(64))).rejects.toThrow(
    'blocked',
  );
  expect(await savedCanonical('ImuWa3SJulY')).toBeNull();
});
it('concurrent different-video verification retains both offline references', async () => {
  setup();
  const a = record(),
    b = { ...record(), videoId: 'BBBBBBBBBBB', audioSha256: 'd'.repeat(64) };
  await Promise.all([
    rememberCanonical(a, 'c'.repeat(64)),
    rememberCanonical(b, 'e'.repeat(64)),
  ]);
  expect(await savedCanonical(a.videoId)).toEqual(a);
  expect(await savedCanonical(b.videoId)).toEqual(b);
});
it('concurrent conflicting identities for one video cannot replace its verified reference', async () => {
  const storage = setup(),
    a = record(),
    b = { ...record(), audioSha256: 'd'.repeat(64) };
  const outcomes = await Promise.allSettled([
    rememberCanonical(a, 'c'.repeat(64)),
    rememberCanonical(b, 'e'.repeat(64)),
  ]);
  expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.filter((x) => x.status === 'rejected')).toHaveLength(1);
  const refs = JSON.parse(storage.get('orvio.canonical-library.v1')!);
  expect(refs).toHaveLength(1);
  expect(refs[0].audioSha256).toBe(
    outcomes[0].status === 'fulfilled' ? a.audioSha256 : b.audioSha256,
  );
});
