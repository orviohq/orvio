// BUILD-owned two-branch composition. Branch implementations retain all gates.
// This map records a service that actually restored the exact immutable id,
// never a video, generator claim, URL prefix or cached admission verdict.
export function createVersioned468Frontend({ legacy, unified }) {
  if (!legacy || !unified || legacy === unified)
    throw Error('versioned_frontend_dependencies');
  const owner = new Map();
  const bind = (id, branch) => {
    const previous = owner.get(id);
    if (previous && previous !== branch)
      throw Error('versioned_identity_collision');
    owner.set(id, branch);
  };
  const probe = async (branch, song, options) => {
    const found = await branch.restore(song, options);
    options?.signal?.throwIfAborted();
    if (found !== null && found?.id !== song)
      throw Error('versioned_restore_identity');
    return found;
  };
  const assertUnique = async (song, branch, options) => {
    const previous = owner.get(song);
    if (previous && previous !== branch)
      throw Error('versioned_identity_collision');
    const other = branch === unified ? legacy : unified;
    if ((await probe(other, song, options)) !== null)
      throw Error('versioned_identity_collision');
  };
  const locate = async (song, options) => {
    options?.signal?.throwIfAborted();
    // Check BOTH namespaces on every resolution. An existing owner hint never
    // overrides a newly conflicting immutable identity or a verification error.
    const fresh = await probe(unified, song, options);
    const old = await probe(legacy, song, options);
    if (fresh !== null && old !== null)
      throw Error('versioned_identity_collision');
    const branch = fresh !== null ? unified : old !== null ? legacy : null;
    if (branch) bind(song, branch);
    return { branch, found: fresh ?? old };
  };
  const required = async (song, options) => {
    const { branch } = await locate(song, options);
    if (!branch) throw Error('extension_not_restored');
    return branch;
  };
  const sessionSong = (key) => {
    if (typeof key !== 'string') throw Error('versioned_session_key');
    const i = key.lastIndexOf(':');
    if (
      i < 1 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        key.slice(i + 1),
      )
    )
      throw Error('versioned_session_key');
    return key.slice(0, i);
  };
  const api = {
    generationForSong: (song) =>
      owner.get(song) === unified
        ? 'unified'
        : owner.get(song) === legacy
          ? 'legacy'
          : undefined,
    async pin(...args) {
      // The real frontend's immutable identity is fully determined by the
      // request. Check for an existing other-namespace owner BEFORE its write,
      // then check again afterwards to catch a concurrent conflicting arrival.
      // Distinct database transactions are intentionally not claimed atomic.
      const extension = args[0]?.extension;
      const expected =
        extension &&
        `yt-opus-${extension.videoId}-${extension.audioSha256}-c${extension.baseChartSetSha256}-x${extension.extensionSha256}`;
      if (expected) await assertUnique(expected, unified, args[4]);
      const result = await unified.pin(...args);
      if (
        !result?.song?.id ||
        result.localPinCommitted !== true ||
        (expected && result.song.id !== expected)
      )
        throw Error('versioned_pin_identity');
      await assertUnique(result.song.id, unified, args[4]);
      bind(result.song.id, unified);
      return result;
    },
    async restore(song, options) {
      const { found } = await locate(song, options);
      return found;
    },
    async catalogView(song, options) {
      return (await required(song, options)).catalogView(song, options);
    },
    // Normal source selection never falls back to a superseded generator.
    async readSavedSourceCandidate(base, options) {
      return unified.readSavedSourceCandidate(base, options);
    },
    async restoreSourceView(base, options) {
      const view = await unified.restoreSourceView(base, options);
      if (view !== null) {
        if (!view?.song?.id) throw Error('versioned_restore_identity');
        await assertUnique(view.song.id, unified, options);
        bind(view.song.id, unified);
      }
      return view;
    },
    async restoreCatalogViews(options) {
      const views = [];
      for (const branch of [legacy, unified]) {
        const rows = await branch.restoreCatalogViews(options);
        for (const view of rows) {
          bind(view.song.id, branch);
          views.push(view);
        }
      }
      return views;
    },
    async restoreCatalog(options) {
      return (await api.restoreCatalogViews(options)).map((v) => v.song);
    },
    list() {
      const rows = [...legacy.list(), ...unified.list()];
      const ids = new Set();
      for (const row of rows) {
        if (!row?.id || ids.has(row.id))
          throw Error('versioned_identity_collision');
        ids.add(row.id);
      }
      return rows;
    },
    async play(song, selection, settings, context, options) {
      return (await required(song, options)).play(
        song,
        selection,
        settings,
        context,
        options,
      );
    },
    async saveSession(replay, result, options) {
      return (await required(replay.song, options)).saveSession(
        replay,
        result,
        options,
      );
    },
    async restoreSession(key, options) {
      return (await required(sessionSong(key), options)).restoreSession(
        key,
        options,
      );
    },
    async readSession(key, options) {
      return (await required(sessionSong(key), options)).readSession(
        key,
        options,
      );
    },
    async exportShare(key, options) {
      return (await required(sessionSong(key), options)).exportShare(
        key,
        options,
      );
    },
    async listSessions(options) {
      const rows = [];
      for (const branch of [legacy, unified]) {
        const sessions = await branch.listSessions(options);
        for (const row of sessions) {
          bind(row.song, branch);
          rows.push(row);
        }
      }
      return rows;
    },
  };
  return Object.freeze(api);
}
