import { describe, expect, it } from 'vitest';
import {
  queryKeys,
  queryRetry,
  shouldPersistQuery,
  QUERY_CACHE_SCHEMA,
} from '../src/query-client';

describe('queryKeys', () => {
  it('groups and identities stay distinct per entity', () => {
    expect(queryKeys.sharedReplay('abc')).toEqual(['shared-replay', 'abc']);
    expect(queryKeys.earlyMetadata('vid12345678')).toEqual([
      'early-metadata',
      'vid12345678',
    ]);
    expect(queryKeys.canonicalMetadata('vid12345678', 'chart1')).toEqual([
      'canonical-metadata',
      'vid12345678',
      'chart1',
    ]);
    expect(
      queryKeys.canonicalMetadata('vid12345678', 'chart1')[2] ===
        queryKeys.canonicalMetadata('vid12345678', 'chart2')[2],
    ).toBe(false);
    expect(queryKeys.audioJob('job1')).toEqual(['audio-job', 'job1']);
  });
});

describe('queryRetry', () => {
  const abort = new DOMException('Aborted', 'AbortError');
  it('never retries aborts', () => {
    expect(queryRetry(0, abort)).toBe(false);
  });
  it('never retries permanent 4xx', () => {
    for (const status of [400, 401, 403, 404, 410, 413, 422])
      expect(queryRetry(0, { status })).toBe(false);
  });
  it('retries 408/429, 5xx and network errors within the cap', () => {
    expect(queryRetry(0, { status: 408 })).toBe(true);
    expect(queryRetry(0, { status: 429 })).toBe(true);
    expect(queryRetry(0, { status: 500 })).toBe(true);
    expect(queryRetry(0, { status: 502 })).toBe(true);
    expect(queryRetry(0, new Error('network_error'))).toBe(true);
  });
  it('stops after the official default of 3 retries', () => {
    expect(queryRetry(3, { status: 500 })).toBe(false);
    expect(queryRetry(2, { status: 500 })).toBe(true);
  });
});

describe('shouldPersistQuery', () => {
  const fake = (group: string, status: string, data: unknown) =>
    ({ queryKey: [group, 'x'], state: { status, data } }) as never;
  it('persists small JSON groups with real data', () => {
    expect(shouldPersistQuery(fake('shared-replay', 'success', { a: 1 }))).toBe(
      true,
    );
    expect(shouldPersistQuery(fake('early-metadata', 'success', {}))).toBe(
      true,
    );
    expect(shouldPersistQuery(fake('canonical-metadata', 'success', {}))).toBe(
      true,
    );
  });
  it('never persists chart records, job status, misses or failures', () => {
    expect(shouldPersistQuery(fake('canonical-source', 'success', {}))).toBe(
      false,
    );
    expect(shouldPersistQuery(fake('audio-job', 'success', {}))).toBe(false);
    expect(shouldPersistQuery(fake('shared-replay', 'success', null))).toBe(
      false,
    );
    expect(shouldPersistQuery(fake('shared-replay', 'error', { a: 1 }))).toBe(
      false,
    );
  });
});

describe('schema buster', () => {
  it('is a data-schema version, not a deploy hash', () => {
    expect(QUERY_CACHE_SCHEMA).toMatch(/^orvio-query-v\d+$/);
  });
});
