// Private composition bridge over the current frontend. No public caller or producer policy.
import {
  difficultyForChart,
  type ChartDifficultyMetadata,
} from '../chart-difficulty';
import { createOpus468Entry } from './opus468-entry';
import type { createOpus468Frontend } from './opus468-frontend';
import type { Difficulty, Lanes, Song, Note } from '../chart';
type Frontend = ReturnType<typeof createOpus468Frontend>;
/** The composition root owns this service. Untrusted charts never supply callbacks. */
export function createCurrentOpus468Bridge() {
  let frontend: Frontend | undefined;
  let entry: ReturnType<typeof createOpus468Entry> | undefined;
  let epoch = 0;
  const views = new Map<string, Awaited<ReturnType<Frontend['catalogView']>>>();
  const displayCache = new WeakMap<
    object,
    Map<
      string,
      { count: number; metadata: ChartDifficultyMetadata | undefined }
    >
  >();
  const cancel = () => {
    epoch++;
    entry?.cancel();
  };
  return Object.freeze({
    cancel,
    owns: (song: string) => views.has(song),
    baseRecord: (song: string) => {
      const base = views.get(song)?.baseRecord;
      return base ? structuredClone(base) : undefined;
    },
    chart(
      song: string,
      lanes: Lanes,
      difficulty: Difficulty,
    ): Note[] | undefined {
      const view = views.get(song);
      return view
        ? structuredClone(view.charts[`${lanes}:${difficulty}`]?.notes ?? [])
        : undefined;
    },
    display(song: string, lanes: Lanes, difficulty: Difficulty) {
      const view = views.get(song);
      if (!view) return undefined;
      let modes = displayCache.get(view);
      if (!modes) {
        modes = new Map();
        displayCache.set(view, modes);
      }
      const key = `${lanes}:${difficulty}` as const;
      const prior = modes.get(key);
      if (prior) return prior;
      const notes = view.charts[key]?.notes ?? [];
      const value = Object.freeze({
        count: notes.length,
        metadata: notes.length
          ? difficultyForChart(notes, view.seconds, key)
          : undefined,
      });
      modes.set(key, value);
      return value;
    },
    seconds: (song: string) => views.get(song)?.seconds,
    async attach(service: Frontend, { signal }: { signal?: AbortSignal } = {}) {
      signal?.throwIfAborted();
      if (frontend && frontend !== service)
        throw Error('extension_frontend_conflict');
      cancel();
      const token = epoch;
      const optimized = service as Frontend & {
        restoreCatalogViews?: (options: {
          signal?: AbortSignal;
        }) => Promise<Awaited<ReturnType<Frontend['catalogView']>>[]>;
      };
      const next: Awaited<ReturnType<Frontend['catalogView']>>[] = [];
      if (typeof optimized.restoreCatalogViews === 'function')
        next.push(...(await optimized.restoreCatalogViews({ signal })));
      else {
        await service.restoreCatalog({ signal });
        for (const song of service.list())
          next.push(await service.catalogView(song.id, { signal }));
      }
      signal?.throwIfAborted();
      if (token !== epoch) throw Error('extension_entry_stale');
      // No partial visible catalog if one row fails. Existing 5/7 catalog is untouched.
      frontend = service;
      entry = createOpus468Entry(service);
      views.clear();
      for (const view of next) views.set(view.song.id, view);
      return next.map((view) => structuredClone(view.song)) as Song[];
    },
    async attachSource(
      service: Frontend,
      base: import('./opus-record').OpusRecord,
      { signal }: { signal?: AbortSignal } = {},
    ) {
      signal?.throwIfAborted();
      if (frontend && frontend !== service)
        throw Error('extension_frontend_conflict');
      const source = service as Frontend & {
        restoreSourceView: (
          base: import('./opus-record').OpusRecord,
          options: { signal?: AbortSignal },
        ) => Promise<Awaited<ReturnType<Frontend['catalogView']>> | null>;
      };
      if (typeof source.restoreSourceView !== 'function')
        throw Error('extension_source_restore_unavailable');
      cancel();
      const token = epoch,
        view = await source.restoreSourceView(structuredClone(base), {
          signal,
        });
      signal?.throwIfAborted();
      if (token !== epoch) throw Error('extension_entry_stale');
      if (view === null) return null;
      frontend = service;
      entry ??= createOpus468Entry(service);
      views.set(view.song.id, view);
      return [structuredClone(view.song)] as Song[];
    },
    async attachSong(
      service: Frontend,
      song: string,
      { signal }: { signal?: AbortSignal } = {},
    ) {
      signal?.throwIfAborted();
      if (frontend && frontend !== service)
        throw Error('extension_frontend_conflict');
      cancel();
      const token = epoch;
      const view = await service.catalogView(song, { signal });
      signal?.throwIfAborted();
      if (token !== epoch || view.song.id !== song)
        throw Error('extension_entry_stale');
      frontend = service;
      entry ??= createOpus468Entry(service);
      views.set(song, view);
      return [structuredClone(view.song)] as Song[];
    },
    async saveSession(...args: Parameters<Frontend['saveSession']>) {
      if (!frontend) throw Error('extension_not_restored');
      return frontend.saveSession(...args);
    },
    async readSession(id: string, signal?: AbortSignal) {
      if (!frontend) throw Error('extension_not_restored');
      const token = epoch;
      const loaded = await frontend.restoreSession(id, { signal });
      if (!loaded) throw Error('extension_session_missing');
      const view = await frontend.catalogView(loaded.session.song, { signal });
      signal?.throwIfAborted();
      if (token !== epoch) throw Error('extension_entry_stale');
      views.set(view.song.id, view);
      return { session: loaded.session, song: structuredClone(view.song) };
    },
    async listSessions() {
      if (!frontend) throw Error('extension_not_restored');
      const rows = await frontend.listSessions();
      for (const row of rows) {
        const view = await frontend.catalogView(row.song);
        views.set(view.song.id, view);
      }
      return { rows, songs: frontend.list() };
    },
    async preview(
      song: string,
      lanes: Lanes,
      difficulty: Difficulty,
      context: BaseAudioContext,
      signal?: AbortSignal,
    ) {
      if (!frontend || !views.has(song) || ![4, 6, 8].includes(lanes))
        throw Error('extension_selection_unavailable');
      return frontend.play(
        song,
        { lanes: lanes as 4 | 6 | 8, difficulty },
        { shuffle: 'off', seed: 0 },
        context,
        { signal },
      );
    },
    async prepare(
      input: Parameters<ReturnType<typeof createOpus468Entry>['start']>[0],
      {
        signal,
        replaySession,
      }: { signal?: AbortSignal; replaySession?: string } = {},
    ) {
      if (!frontend || !entry || !views.has(input.song))
        throw Error('extension_not_restored');
      signal?.throwIfAborted();
      const token = epoch;
      const ownedEntry = entry,
        ownedFrontend = frontend;
      const abort = () => ownedEntry.cancel();
      signal?.addEventListener('abort', abort, { once: true });
      try {
        const prepared = await ownedEntry.start(input);
        const session = replaySession
          ? await ownedFrontend.readSession(replaySession, { signal })
          : undefined;
        signal?.throwIfAborted();
        if (token !== epoch) throw Error('extension_entry_stale');
        if (replaySession && !session) throw Error('extension_session_missing');
        // Callers must use these exact Engine and AudioBuffer, never rebuild from view notes.
        return {
          buffer: prepared.audio,
          engine: session?.engine ?? prepared.engine,
          identity: prepared.identity,
        };
      } finally {
        signal?.removeEventListener('abort', abort);
      }
    },
  });
}
