// Shared-key persistence policy for the ORV-62 query cache: a pre-consent
// inspect read (shared song link) must not persist, while the normal warm
// cache for the SAME key must never be silently downgraded.
import { describe, expect, it } from 'vitest';
import {
  queryClient,
  queryKeys,
  markQueryEphemeral,
  shouldPersistQuery,
} from '../src/query-client';

const key = queryKeys.canonicalMetadata('AAAAAAAAAAA', 'bb'.repeat(32));

async function read(persist: boolean) {
  markQueryEphemeral(key, !persist);
  return queryClient.fetchQuery({
    queryKey: key,
    queryFn: async () => ({ title: 't' }),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}

const persistable = () => {
  const query = queryClient.getQueryCache().find({ queryKey: key });
  return query ? shouldPersistQuery(query) : false;
};

describe('shared canonical-metadata key persistence policy', () => {
  it('inspect read is not persisted', async () => {
    await read(false);
    expect(persistable()).toBe(false);
  });
  it('normal read after inspect re-enables persistence (inspect -> normal)', async () => {
    await read(false);
    expect(persistable()).toBe(false);
    await read(true);
    expect(persistable()).toBe(true);
  });
  it('inspect after normal read does not destroy the entry, only the persistence (normal -> inspect -> normal)', async () => {
    await read(true);
    expect(persistable()).toBe(true);
    await read(false);
    expect(persistable()).toBe(false);
    expect(
      queryClient.getQueryCache().find({ queryKey: key })?.state.data,
    ).toEqual({ title: 't' });
    await read(true);
    expect(persistable()).toBe(true);
  });
  it('marks are per key: another key is unaffected', async () => {
    const other = queryKeys.canonicalMetadata('BBBBBBBBBBB', 'cc'.repeat(32));
    markQueryEphemeral(key, true);
    await queryClient.fetchQuery({
      queryKey: other,
      queryFn: async () => ({ title: 'u' }),
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
    });
    const query = queryClient.getQueryCache().find({ queryKey: other });
    expect(query && shouldPersistQuery(query)).toBe(true);
  });
});
