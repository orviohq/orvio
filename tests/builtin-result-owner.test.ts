import { it, expect, vi, beforeEach } from 'vitest';
const read = vi.fn(),
  encode = vi.fn();
vi.mock('../src/builtin-replay-library', () => ({
  readBuiltinSession: (...a: any[]) => read(...a),
}));
vi.mock('../src/builtin-share-fragment', () => ({
  builtinShareFragment: (...a: any[]) => encode(...a),
}));
import {
  rememberBuiltinResultOwner,
  isArchivedBuiltinResult,
} from '../src/builtin-result-owner';
let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  read.mockReset();
  encode.mockReset();
});
it('empty recipient and old/unindexed fragment never open archive or write', async () => {
  expect(await isArchivedBuiltinResult('v=4&score=0')).toBe(false);
  expect(read).not.toHaveBeenCalled();
  expect(data.size).toBe(0);
});
it('indexed match validates one direct archive and exact fragment', async () => {
  await rememberBuiltinResultOwner(
    'v=4&one',
    'builtin:11111111-2222-4333-8444-555555555555',
  );
  read.mockResolvedValue({ replay: {}, result: {}, chart: [] });
  encode.mockResolvedValue('v=4&one');
  expect(await isArchivedBuiltinResult('v=4&one')).toBe(true);
  expect(read).toHaveBeenCalledTimes(1);
  expect(await isArchivedBuiltinResult('v=4&two')).toBe(false);
  expect(read).toHaveBeenCalledTimes(1);
  encode.mockResolvedValue('other');
  expect(await isArchivedBuiltinResult('v=4&one')).toBe(false);
});
it('more than8 own results retain earliest ownership via direct hash keys', async () => {
  for (let i = 0; i < 24; i++)
    await rememberBuiltinResultOwner(
      'v=4&private' + i,
      'builtin:11111111-2222-4333-8444-555555555555',
    );
  expect(data.size).toBe(24);
  expect([...data.keys()].join('')).not.toContain('private');
  read.mockResolvedValue({ replay: {}, result: {}, chart: [] });
  encode.mockResolvedValue('v=4&private0');
  expect(await isArchivedBuiltinResult('v=4&private0')).toBe(true);
  expect(read).toHaveBeenCalledTimes(1);
  read.mockRejectedValue(Error('corrupt'));
  expect(await isArchivedBuiltinResult('v=4&private23')).toBe(false);
});
