type RestoreInput<TSession, TView> = {
  href: string;
  navigation: number;
  currentHref: () => string;
  currentNavigation: () => number;
  active: () => boolean;
  preparing: () => boolean;
  local: string;
  expectedBase?: unknown;
  signal?: AbortSignal;
  restoreSession: (
    key: string,
    signal?: AbortSignal,
  ) => Promise<{ session: TSession } | null>;
  sessionSong: (session: TSession) => string | undefined;
  catalogView: (
    song: string,
    options: { signal?: AbortSignal },
  ) => Promise<TView>;
  viewBase: (view: TView) => unknown;
  install: (song: string, signal: AbortSignal) => Promise<void>;
};

export function isOwnedColdResultRoute({
  href,
  navigation,
  currentHref,
  currentNavigation,
  active,
  preparing,
}: Pick<
  RestoreInput<unknown, unknown>,
  | 'href'
  | 'navigation'
  | 'currentHref'
  | 'currentNavigation'
  | 'active'
  | 'preparing'
>) {
  if (active() || preparing()) return false;
  if (currentHref() !== href || currentNavigation() !== navigation)
    return false;
  const url = new URL(href, 'https://orvio.invalid');
  const local = url.searchParams.get('local');
  return (
    url.pathname === '/result/' &&
    url.hash === '' &&
    url.searchParams.size === 1 &&
    !!local &&
    local.startsWith('yt-opus-')
  );
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return (
      '{' +
      Object.keys(value as object)
        .sort()
        .map(
          (key) => JSON.stringify(key) + ':' + canonical((value as any)[key]),
        )
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

function sameRecord(a: unknown, b: unknown) {
  return canonical(a) === canonical(b);
}

export function createColdResultRestoreCoordinator() {
  type Result<TView> = {
    song: string;
    view: TView;
    matched: boolean;
  };
  const queue = new Map<string, Promise<void>>();
  const restore = async <TSession, TView>(
    input: RestoreInput<TSession, TView>,
  ): Promise<
    | { handled: false }
    | { handled: boolean; matched: boolean; song: string; view: TView }
  > => {
    if (
      !isOwnedColdResultRoute(input) ||
      new URL(input.href).searchParams.get('local') !== input.local
    )
      return { handled: false as const };
    const key = `${input.navigation}:${input.href}:${input.local}`;
    const prior = queue.get(key) ?? Promise.resolve();
    let release!: () => void;
    const turn = new Promise<void>((resolve) => (release = resolve));
    const chain = prior.then(() => turn);
    queue.set(key, chain);
    await prior;
    try {
      if (!isOwnedColdResultRoute(input)) return { handled: false as const };
      const result = await (async () => {
        input.signal?.throwIfAborted();
        const loaded = await input.restoreSession(input.local, input.signal);
        if (!loaded) throw Error('extension_session_missing');
        const song = input.sessionSong(loaded.session);
        if (!song) throw Error('extension_session_song');
        const session = loaded.session as any;
        if (
          session.key !== input.local ||
          session.replay?.song !== song ||
          !new RegExp(
            '^' +
              song.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
              ':[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            'i',
          ).test(input.local)
        )
          throw Error('extension_session_identity');
        const view = await input.catalogView(song, { signal: input.signal });
        input.signal?.throwIfAborted();
        if (
          input.expectedBase !== undefined &&
          !sameRecord(input.viewBase(view), input.expectedBase)
        )
          return { song, view, matched: false };
        if (!isOwnedColdResultRoute(input)) throw Error('extension_add_stale');
        await input.install(song, input.signal ?? new AbortController().signal);
        if (!isOwnedColdResultRoute(input)) throw Error('extension_add_stale');
        return { song, view, matched: true } as Result<TView>;
      })();
      const matched =
        result.matched &&
        (input.expectedBase === undefined ||
          sameRecord(input.viewBase(result.view), input.expectedBase));
      return {
        handled: matched,
        matched,
        song: result.song,
        view: result.view,
      } as const;
    } finally {
      release();
      if (queue.get(key) === chain) queue.delete(key);
    }
  };
  return { restore };
}
