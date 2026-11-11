import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { enqueueFaultOccurrence, readFaultOutbox } from '../src/fault-alert-outbox';
import { acknowledgeFailures, hasUnacknowledgedFailure, readFailures, recordFailure } from '../src/status-failures';

const KEY = 'orvio-fault-alert-outbox';
let data: Map<string, string>;
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
let dispatchEvent: ReturnType<typeof vi.fn>;
beforeEach(() => {
  data = new Map();
  storage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
  };
  dispatchEvent = vi.fn();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { dispatchEvent });
  vi.stubGlobal('crypto', { randomUUID });
  vi.spyOn(Date, 'now').mockReturnValue(123456);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('hooks all three areas with opaque IDs and no raw text in the outbox', () => {
  const raw = 'private user songID stack https://example.test/private';
  for (const area of ['access', 'playback', 'youtube-add'] as const) recordFailure(area, raw);
  const queue = readFaultOutbox();
  expect(queue.map(item => item.reasonCode)).toEqual(expect.arrayContaining(['access_failed', 'playback_failed', 'youtube_add_failed']));
  expect(new Set(queue.map(item => item.occurrenceId)).size).toBe(3);
  for (const item of queue) {
    expect(Object.keys(item).sort()).toEqual(['area', 'observedAt', 'occurrenceId', 'reasonCode']);
    expect(item.observedAt).toBe(123456);
    expect(item.occurrenceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.isFrozen(item)).toBe(true);
  }
  expect(Object.isFrozen(queue)).toBe(true);
  expect(data.get(KEY)).not.toContain(raw);
  expect(JSON.stringify(queue)).not.toMatch(/private|https|songID|stack/);
  expect(readFailures().map(item => item.message)).toEqual([raw, raw, raw]);
  expect(dispatchEvent).toHaveBeenCalledTimes(3);
  expect(dispatchEvent.mock.calls[0][0].type).toBe('orvio-status-change');
  expect(hasUnacknowledgedFailure()).toBe(true);
  acknowledgeFailures();
  expect(hasUnacknowledgedFailure()).toBe(false);
});

it('matches only exact area-specific reason codes without inspecting objects', () => {
  const getter = vi.fn(() => { throw new Error('secret'); });
  const hostile = Object.defineProperty({}, 'message', { get: getter });
  Object.defineProperty(hostile, 'toString', { get: getter });
  for (const [area, raw, expected] of [
    ['access', 'local_cache_read_failed', 'local_cache_read_failed'],
    ['playback', 'network_error', 'network_error'],
    ['youtube-add', 'metadata_http_error', 'metadata_http_error'],
    ['access', 'network_error', 'access_failed'],
    ['playback', ' network_error', 'playback_failed'],
    ['playback', 'NETWORK_ERROR', 'playback_failed'],
    ['youtube-add', hostile, 'youtube_add_failed'],
  ] as const) {
    data.delete(KEY);
    enqueueFaultOccurrence(area, raw);
    expect(readFaultOutbox()[0].reasonCode).toBe(expected);
  }
  expect(getter).not.toHaveBeenCalled();
});

it('sanitizes persisted fields, deduplicates earliest identity and retains newest ten in order', () => {
  const items = Array.from({ length: 12 }, (_, observedAt) => ({
    area: 'playback', reasonCode: 'network_error', observedAt, occurrenceId: randomUUID(),
    message: 'secret https://example.test', songID: 'private',
  }));
  data.set(KEY, JSON.stringify([{ ...items[11], observedAt: 100 }, ...items].reverse()));
  expect(readFaultOutbox().map(item => item.observedAt)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  enqueueFaultOccurrence('access', 'indexeddb_unavailable');
  const queue = readFaultOutbox();
  expect(queue).toHaveLength(10);
  expect(queue.map(item => item.observedAt)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 123456]);
  expect(data.get(KEY)).not.toMatch(/secret|https|songID|private/);
  for (let i = 0; i < 12; i++) recordFailure('playback', `history ${i}`);
  expect(readFailures().map(item => item.message)).toEqual(Array.from({ length: 10 }, (_, i) => `history ${i + 2}`));
});

it('fails closed on corruption, malicious entries and throwing accessors', () => {
  for (const value of ['broken', '{}', 'null', '[null,123,"private"]']) {
    data.set(KEY, value);
    expect(readFaultOutbox()).toEqual([]);
  }
  const valid = { area: 'access', reasonCode: 'private URL', observedAt: 1, occurrenceId: randomUUID() };
  data.set(KEY, JSON.stringify([{ ...valid, occurrenceId: 'private_song_id' }, { ...valid, observedAt: -1 }, valid]));
  expect(readFaultOutbox()).toEqual([{ ...valid, reasonCode: 'access_failed' }]);
  const getter = vi.fn(() => { throw new Error('secret'); });
  const entries = [Object.defineProperty({ ...valid }, 'reasonCode', { get: getter })];
  Object.defineProperty(entries, '1', { get: getter });
  vi.spyOn(JSON, 'parse').mockReturnValue(entries);
  expect(readFaultOutbox()).toEqual([]);
  expect(getter).not.toHaveBeenCalled();
});

it('isolates outbox read/write and crypto failures from history and UI events', () => {
  storage.getItem.mockImplementation((key: string) => {
    if (key === KEY) throw new Error('read denied');
    return data.get(key) ?? null;
  });
  storage.setItem.mockImplementation((key: string, value: string) => {
    if (key === KEY) throw new Error('quota');
    data.set(key, value);
  });
  expect(() => recordFailure('access', 'raw history')).not.toThrow();
  expect(readFaultOutbox()).toEqual([]);
  expect(readFailures()[0].message).toBe('raw history');
  expect(dispatchEvent).toHaveBeenCalledTimes(1);
  vi.stubGlobal('crypto', Object.defineProperty({}, 'randomUUID', { get() { throw new Error('denied'); } }));
  expect(() => recordFailure('playback', 'still recorded')).not.toThrow();
  expect(readFailures()).toHaveLength(2);
  expect(dispatchEvent).toHaveBeenCalledTimes(2);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
  expect(readFaultOutbox()).toEqual([]);
  expect(() => recordFailure('youtube-add', 'safe')).not.toThrow();
});
