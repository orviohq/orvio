import { expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  createColdResultRestoreCoordinator,
  isOwnedColdResultRoute,
} from '../src/opus/opus468-cold-result-restore';

const song = 'yt-opus-video-audio-cchart-xextension';
const local = `${song}:550e8400-e29b-41d4-a716-446655440000`;
const href = `https://orvio.test/result/?local=${encodeURIComponent(local)}`;
const base = { version: 2, roots: { one: '1', eight: '8' } };

function input(overrides: any = {}) {
  let currentHref = href;
  let currentNavigation = 7;
  let active = false;
  let preparing = false;
  const install = vi.fn(async () => {});
  const restoreSession = vi.fn(async () => ({
    session: { key: local, replay: { song } },
  }));
  const catalogView = vi.fn(async () => ({
    baseRecord: structuredClone(base),
  }));
  return {
    input: {
      href,
      navigation: 7,
      currentHref: () => currentHref,
      currentNavigation: () => currentNavigation,
      active: () => active,
      preparing: () => preparing,
      local,
      expectedBase: structuredClone(base),
      restoreSession,
      sessionSong: (session: any) => session.replay.song,
      catalogView,
      viewBase: (view: any) => view.baseRecord,
      install,
      ...overrides,
    },
    install,
    restoreSession,
    catalogView,
    setHref(value: string) {
      currentHref = value;
    },
    setNavigation(value: number) {
      currentNavigation = value;
    },
    setActive(value: boolean) {
      active = value;
    },
    setPreparing(value: boolean) {
      preparing = value;
    },
  };
}

it('accepts only the exact inactive cold result route', () => {
  const state = input();
  expect(isOwnedColdResultRoute(state.input)).toBe(true);
  state.setHref(
    'https://orvio.test/select/?local=' + encodeURIComponent(local),
  );
  expect(isOwnedColdResultRoute(state.input)).toBe(false);
  state.setHref(href + '#fragment');
  expect(isOwnedColdResultRoute(state.input)).toBe(false);
  state.setHref(href);
  state.setActive(true);
  expect(isOwnedColdResultRoute(state.input)).toBe(false);
  state.setActive(false);
  state.setPreparing(true);
  expect(isOwnedColdResultRoute(state.input)).toBe(false);
  state.setPreparing(false);
  state.setNavigation(8);
  expect(isOwnedColdResultRoute(state.input)).toBe(false);
  const captured = input();
  captured.input.href = 'https://orvio.test/select/';
  captured.setHref(captured.input.href);
  expect(isOwnedColdResultRoute(captured.input)).toBe(false);
});

it('restores the exact session, binds the full base, and targets its song', async () => {
  const state = input();
  const result = await createColdResultRestoreCoordinator().restore(
    state.input,
  );
  expect('matched' in result && result.matched).toBe(true);
  expect(state.restoreSession).toHaveBeenCalledWith(local, undefined);
  expect(state.catalogView).toHaveBeenCalledWith(song, { signal: undefined });
  expect(state.install).toHaveBeenCalledOnce();
  expect(state.install).toHaveBeenCalledWith(song, expect.any(AbortSignal));
});

it.each([
  ['session key', { session: { key: 'other', replay: { song } } }],
  ['replay song', { session: { key: local, replay: { song: 'other' } } }],
  ['malformed id', { session: { key: `${song}:bad`, replay: { song } } }],
])('rejects %s identity', async (_name, loaded) => {
  const state = input({ restoreSession: vi.fn(async () => loaded) });
  await expect(
    createColdResultRestoreCoordinator().restore(state.input),
  ).rejects.toThrow('extension_session_identity');
  expect(state.install).not.toHaveBeenCalled();
});

it('rejects an unrelated full base, including a changed eighth root', async () => {
  const state = input({
    expectedBase: { version: 2, roots: { one: '1', eight: 'wrong' } },
  });
  const result = await createColdResultRestoreCoordinator().restore(
    state.input,
  );
  expect('matched' in result && result.matched).toBe(false);
  expect(state.install).not.toHaveBeenCalled();
});

it('serializes unrelated metadata rows without letting one install, then admits the exact row', async () => {
  const state = input();
  const coordinator = createColdResultRestoreCoordinator();
  const unrelated = coordinator.restore({
    ...state.input,
    expectedBase: { version: 2, roots: { one: 'other', eight: 'other' } },
  });
  const exact = coordinator.restore(state.input);
  await expect(unrelated).resolves.toMatchObject({ matched: false });
  await expect(exact).resolves.toMatchObject({ matched: true });
  expect(state.install).toHaveBeenCalledOnce();
});

it('rechecks route after queue wait and during restore', async () => {
  const state = input();
  let release!: () => void;
  state.restoreSession.mockImplementationOnce(
    () =>
      new Promise(
        (resolve) =>
          (release = () =>
            resolve({ session: { key: local, replay: { song } } })),
      ),
  );
  const pending = createColdResultRestoreCoordinator().restore(state.input);
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  state.setHref('https://orvio.test/result/?local=other');
  release();
  await expect(pending).rejects.toThrow('extension_add_stale');
  expect(state.install).not.toHaveBeenCalled();
});

it('does not start the next queued restore after its route changes', async () => {
  const first = input();
  let release!: () => void;
  first.restoreSession.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = () => resolve({ session: { key: local, replay: { song } } });
      }),
  );
  const coordinator = createColdResultRestoreCoordinator();
  const firstWork = coordinator.restore(first.input);
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  const second = input();
  const secondWork = coordinator.restore(second.input);
  second.setHref('https://orvio.test/result/?local=changed');
  release();
  await firstWork;
  await expect(secondWork).resolves.toMatchObject({ handled: false });
  expect(second.restoreSession).not.toHaveBeenCalled();
});

it('rejects navigation, active, and preparing changes during install staging', async () => {
  for (const change of ['navigation', 'active', 'preparing'] as const) {
    const state = input();
    let release!: () => void;
    state.input.install = vi.fn(
      () => new Promise<void>((resolve) => (release = resolve)),
    );
    const pending = createColdResultRestoreCoordinator().restore(state.input);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    if (change === 'navigation') state.setNavigation(8);
    if (change === 'active') state.setActive(true);
    if (change === 'preparing') state.setPreparing(true);
    release();
    await expect(pending).rejects.toThrow('extension_add_stale');
  }
});

it('aborts after catalog validation before install', async () => {
  const state = input();
  const controller = new AbortController();
  state.input.signal = controller.signal;
  state.catalogView.mockImplementationOnce(async () => {
    controller.abort(Error('catalog_stop'));
    return { baseRecord: structuredClone(base) };
  });
  await expect(
    createColdResultRestoreCoordinator().restore(state.input),
  ).rejects.toThrow('catalog_stop');
  expect(state.install).not.toHaveBeenCalled();
});

it('rejects an abort before any source or install work', async () => {
  const state = input();
  const controller = new AbortController();
  controller.abort(Error('stop'));
  await expect(
    createColdResultRestoreCoordinator().restore({
      ...state.input,
      signal: controller.signal,
    }),
  ).rejects.toThrow('stop');
  expect(state.restoreSession).not.toHaveBeenCalled();
  expect(state.install).not.toHaveBeenCalled();
});

it('wires the cold guard after verified metadata restore without widening selection admission', () => {
  const source = fs.readFileSync(
    new URL('../src/main.ts', import.meta.url),
    'utf8',
  );
  expect(source).toContain(
    "const canInstallExtension = () => !active && !preparing && screen === 'select';",
  );
  expect(source).toMatch(
    /const frontendInstallCurrent[\s\S]*location\.href === href[\s\S]*navigationVersion === navigation[\s\S]*!active[\s\S]*!preparing/,
  );
  expect(source).toContain('expectedBase: base');
  expect(source).toMatch(
    /install: async \(song: string, installSignal: AbortSignal\)[\s\S]*installPrivateOpus468Frontend[\s\S]*song,[\s\S]*signal: installSignal/,
  );
  expect(source).toContain(
    'await waitAcquired(legacyMetadataReady, c.signal);',
  );
  expect(source.indexOf('legacyMetadataReadyResolve();')).toBeGreaterThan(
    source.indexOf('await readInitialRoute()'),
  );
});
