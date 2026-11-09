// ORV-62: one TanStack Query (React Query) client owns every network data
// fetch. The Orvio shell is plain DOM, not a React tree, so the client is
// used directly — this is the same QueryClient that react-query's hooks
// wrap, and React already ships in the bundle for the sonner toast root.
import { QueryClient, hashKey, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from '@tanstack/query-persist-client-core';

/**
 * Persisted-cache schema version. Bump only when stored entry shapes change
 * incompatibly; ordinary deploys must never bust a warm cache.
 * v1 -> v2: v1 snapshots may contain shared-link inspect data persisted
 * before the recipient's Add (the pre-consent trace song-share.spec
 * forbids). The /song/ page can only ever write canonical-metadata
 * entries (verified: it reaches no shared-replay/early-metadata writer),
 * so instead of busting the whole generation, the restore below accepts
 * v1 snapshots but drops their canonical-metadata queries; v2 snapshots
 * (written only after the inspect path stopped persisting) hydrate
 * untouched. shared-replay and early-metadata warm entries survive.
 */
export const QUERY_CACHE_SCHEMA = 'orvio-query-v2';

/** Groups dropped when accepting a legacy v1 snapshot (see above). */
const LEGACY_DROP_GROUPS = new Set(['canonical-metadata']);
const DATABASE = 'orvio.query-cache.v1';
const STORE = 'client';
const STORAGE_KEY = 'orvio-query-client';

function openDb(create: boolean): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (create) {
        request.result.createObjectStore(STORE);
      } else {
        // Probe open: the database did not exist. Aborting the upgrade
        // transaction rolls the creation back, so a read can check for a
        // snapshot without leaving an empty database behind. This works in
        // every browser, including ones without IDBFactory.databases().
        request.transaction?.abort();
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Query cache storage unavailable'));
  });
}

/** True when the open failed because a probe found no database. */
function isProbeMiss(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function idbRequest<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | undefined,
  create = true,
): Promise<T | undefined> {
  const db = await openDb(create);
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
  // Reads never create the database: a first visit must leave zero
  // persistent trace (share-page no-trace invariant). A probe miss is a
  // clean null, which makes persistQueryClientRestore a no-op.
  getItem: (key: string) =>
    idbRequest<string>('readonly', (store) => store.get(key), false).then(
      (value) => value ?? null,
      (error) => {
        if (isProbeMiss(error)) return null;
        throw error;
      },
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
    // Pre-consent reads (shared-link inspect) mark their key ephemeral on
    // this page's client, so a link view never writes the snapshot. The
    // mark is memory-only and per read, not query meta: an existing warm
    // entry keeps its own options untouched, and a later normal read of the
    // same key clears the mark, so normal consumer persistence is never
    // silently downgraded.
    !ephemeralQueryHashes.has(query.queryHash) &&
    PERSISTED_GROUPS.has(String(query.queryKey[0])) &&
    query.state.status === 'success' &&
    query.state.data != null
  );
}

/** Memory-only set of query hashes fetched pre-consent on this page. Never
 * persisted, so restored warm entries come back unmarked. */
const ephemeralQueryHashes = new Set<string>();

/** Mark or clear a key as ephemeral (pre-consent) for this page's client.
 * The most recent read's intent wins for that key. */
export function markQueryEphemeral(
  queryKey: readonly unknown[],
  ephemeral: boolean,
): void {
  const hash = hashKey(queryKey);
  if (ephemeral) ephemeralQueryHashes.add(hash);
  else ephemeralQueryHashes.delete(hash);
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
  let pendingClear = false;
  try {
    // Restore only hydrates; idbStorage.getItem above never creates the
    // database, so merely visiting a page leaves no trace. pendingClear
    // records whether STORAGE held a snapshot at boot (the probe read),
    // independent of in-flight pre-consent fetches: if every restored or
    // later query is removed or ineligible, one final empty save clears
    // the old snapshot instead of resurrecting stale entries forever. A
    // discarded (busted/expired) snapshot is already removed by the
    // restore itself; the convergence write then just re-saves empty.
    pendingClear = (await idbStorage.getItem(STORAGE_KEY)) != null;
    // Narrow v1 -> v2 migration (see QUERY_CACHE_SCHEMA): a legacy
    // snapshot is accepted with its canonical-metadata queries dropped and
    // its buster rewritten, so ambiguous pre-consent entries never
    // hydrate while other groups stay warm. v2 snapshots pass through.
    const migratingPersister = {
      ...persister,
      restoreClient: async () => {
        const raw = await persister.restoreClient();
        if (raw && raw.buster === 'orvio-query-v1') {
          const queries = raw.clientState?.queries;
          if (Array.isArray(queries)) {
            raw.clientState.queries = queries.filter(
              (q) => !LEGACY_DROP_GROUPS.has(String(q.queryKey?.[0])),
            );
          }
          raw.buster = QUERY_CACHE_SCHEMA;
        }
        return raw;
      },
    };
    await persistQueryClientRestore({
      queryClient,
      persister: migratingPersister,
      buster: QUERY_CACHE_SCHEMA,
      maxAge: Infinity,
    });
  } catch {
    // A corrupt or unreadable snapshot starts empty; fetching continues.
  }
  // Saves are serialized through this chain so a removal that lands while
  // a save is in flight is always followed by a correcting write: each
  // queued save re-evaluates eligibility and dehydrates AT EXECUTION TIME,
  // never from a stale cache snapshot. The persister's persistClient
  // writes unconditionally, so an unguarded save would create the database
  // even when every query is excluded. Same added/removed/updated events
  // the library's persistQueryClientSubscribe uses; mutations dehydrate
  // nothing under shouldDehydrateQuery.
  let saveChain: Promise<void> = Promise.resolve();
  const save = () => {
    saveChain = saveChain.then(async () => {
      const eligible = queryClient
        .getQueryCache()
        .getAll()
        .some(shouldPersistQuery);
      if (!eligible && !pendingClear) return;
      try {
        await persistQueryClientSave({
          queryClient,
          persister,
          buster: QUERY_CACHE_SCHEMA,
          dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
        });
        pendingClear = eligible;
      } catch {
        // Keep pendingClear; the next cache event retries the write.
      }
    });
  };
  queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === 'added' ||
      event.type === 'removed' ||
      event.type === 'updated'
    )
      save();
  });
  // Hydration happens inside the restore above, before the subscription
  // exists, so converge once here: a restored snapshot whose queries are
  // all ineligible (removed group, opted out) is cleared instead of being
  // resurrected on every visit.
  save();
  // The subscriber alone can lose the last seconds of cache updates when
  // the page is closed or reloaded right after a fetch; flush the snapshot
  // on the way out so the next cold start stays warm.
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
})();

/** Alias kept for integration tests that await the restore barrier by
 * this name. */
export const queryCacheRestored: Promise<void> = queryReady;
