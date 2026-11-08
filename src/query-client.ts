// ORV-62: one TanStack Query (React Query) client owns every network data
// fetch. The Orvio shell is plain DOM, not a React tree, so the client is
// used directly — this is the same QueryClient that react-query's hooks
// wrap, and React already ships in the bundle for the sonner toast root.
import { QueryClient, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
  persistQueryClientSubscribe,
} from '@tanstack/query-persist-client-core';

/**
 * Persisted-cache schema version. Bump only when stored entry shapes change
 * incompatibly; ordinary deploys must never bust a warm cache.
 */
export const QUERY_CACHE_SCHEMA = 'orvio-query-v1';
const DATABASE = 'orvio.query-cache.v1';
const STORE = 'client';
const STORAGE_KEY = 'orvio-query-client';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Query cache storage unavailable'));
  });
}

async function idbRequest<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | undefined,
): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      let value: T | undefined;
      if (request) request.onsuccess = () => (value = request.result);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error('Query cache write interrupted'));
    });
  } finally {
    db.close();
  }
}

const idbStorage = {
  getItem: (key: string) =>
    idbRequest<string>('readonly', (store) => store.get(key)).then(
      (value) => value ?? null,
    ),
  setItem: (key: string, value: string) =>
    idbRequest('readwrite', (store) => store.put(value, key)).then(
      () => undefined,
    ),
  removeItem: (key: string) =>
    idbRequest('readwrite', (store) => store.delete(key)).then(() => undefined),
};

export const queryKeys = {
  sharedReplay: (id: string) => ['shared-replay', id] as const,
  earlyMetadata: (videoId: string) => ['early-metadata', videoId] as const,
  canonicalMetadata: (videoId: string, chartSetSha256: string) =>
    ['canonical-metadata', videoId, chartSetSha256] as const,
  canonicalSource: (videoId: string) => ['canonical-source', videoId] as const,
  audioJob: (jobId: string) => ['audio-job', jobId] as const,
  audioJobBytes: (jobId: string, sha256: string) =>
    ['audio-job-bytes', jobId, sha256] as const,
  canonicalAudioBytes: (videoId: string, sha256: string) =>
    ['canonical-audio-bytes', videoId, sha256] as const,
};

/** Small JSON only: replay payloads and display metadata. Never chart
 * records (canonical IDB owns those) or audio bytes (never query-cached). */
const PERSISTED_GROUPS = new Set<string>([
  'shared-replay',
  'early-metadata',
  'canonical-metadata',
]);

export function shouldPersistQuery(query: Query): boolean {
  return (
    PERSISTED_GROUPS.has(String(query.queryKey[0])) &&
    query.state.status === 'success' &&
    query.state.data != null
  );
}

/** Transient failures retry (official default: 3 with backoff); aborts and
 * permanent 4xx responses never retry. 408/429 stay retryable. */
export function queryRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  if (error instanceof DOMException && error.name === 'AbortError')
    return false;
  const status = (error as { status?: unknown } | null | undefined)?.status;
  if (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  )
    return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: queryRetry,
      // No hook observers exist in a plain-DOM shell; surprise focus or
      // reconnect refetches would only duplicate in-flight coordination.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      // POST endpoints (replay save, audio job creation) are not idempotent.
      retry: false,
    },
  },
});

/** Run a one-shot mutation with a typed result. QueryClient exposes no
 * public executeMutation; build a Mutation off the cache like useMutation
 * does internally. POST endpoints stay retry: false (not idempotent). */
export function runMutation<TData>(
  mutationKey: readonly unknown[],
  mutationFn: () => Promise<TData>,
): Promise<TData> {
  return queryClient
    .getMutationCache()
    .build<TData, Error, void, unknown>(queryClient, {
      mutationKey,
      mutationFn: () => mutationFn(),
      retry: false,
    })
    .execute(undefined);
}

const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: STORAGE_KEY,
  // Small JSON snapshots; save on every cache event so even a reload
  // immediately after a fetch stays warm. Event volume is a few queries
  // per page, so coalescing is unnecessary.
  throttleTime: 0,
});

/**
 * Resolves once the IndexedDB cache snapshot has been restored (or cleanly
 * discarded). Result routes await this before deciding between a warm
 * instant render and a network load; it never gates general app boot.
 * maxAge is unlimited: entries expire by their own semantics (replay
 * expiresAt, per-query staleTime) or by QUERY_CACHE_SCHEMA bump, never by an
 * arbitrary wall-clock cache lifetime or a deploy.
 */
export const queryReady: Promise<void> = (async () => {
  // Outside a browser (unit tests, SSR) there is no IndexedDB and the
  // cache simply starts empty.
  if (typeof indexedDB === 'undefined') return;
  try {
    await persistQueryClientRestore({
      queryClient,
      persister,
      buster: QUERY_CACHE_SCHEMA,
      maxAge: Infinity,
    });
  } catch {
    // A corrupt or unreadable snapshot starts empty; fetching continues.
  }
  persistQueryClientSubscribe({
    queryClient,
    persister,
    buster: QUERY_CACHE_SCHEMA,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
  });
  // The throttled subscriber alone can lose the last seconds of cache
  // updates when the page is closed or reloaded right after a fetch; flush
  // the snapshot on the way out so the next cold start stays warm.
  const flush = () => {
    void persistQueryClientSave({
      queryClient,
      persister,
      buster: QUERY_CACHE_SCHEMA,
      dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
    });
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
})();
