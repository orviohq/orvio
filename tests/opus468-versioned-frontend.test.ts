import { it, expect, vi } from 'vitest';
import { createVersioned468Frontend } from '../src/opus/opus468-versioned-frontend.mjs';
function branch(id: string) {
  return {
    restore: vi.fn(async (s: string) => (s === id ? { id } : null)),
    catalogView: vi.fn(async (s: string) => ({ song: { id: s } })),
    play: vi.fn(async (s: string) => ({ song: s })),
    restoreSession: vi.fn(async (k: string) => ({ key: k })),
    readSession: vi.fn(async (k: string) => ({ key: k })),
    saveSession: vi.fn(async () => id + ':saved'),
    exportShare: vi.fn(async () => id),
    restoreSourceView: vi.fn(async () => null),
    readSavedSourceCandidate: vi.fn(async () => null),
    restoreCatalogViews: vi.fn(async () => [{ song: { id } }]),
    listSessions: vi.fn(async () => [{ song: id }]),
    list: () => [{ id }],
    pin: vi.fn(async () => ({ song: { id }, localPinCommitted: true })),
  };
}
it('normal extension generation/source selection uses only new branch; old exact replay stays old', async () => {
  const legacy = branch('old'),
    unified = branch('new'),
    api = createVersioned468Frontend({ legacy, unified });
  await api.restoreSourceView({});
  expect(legacy.restoreSourceView).not.toHaveBeenCalled();
  expect(await api.restore('old')).toEqual({ id: 'old' });
  expect(api.generationForSong('old')).toBe('legacy');
  await api.play('old', {}, {}, {}, {});
  expect(legacy.play).toHaveBeenCalledOnce();
  expect(unified.play).not.toHaveBeenCalled();
  const key = 'old:12345678-1234-1234-1234-123456789abc';
  await api.restoreSession(key);
  expect(legacy.restoreSession).toHaveBeenCalledWith(key, undefined);
  await api.pin({});
  expect(unified.pin).toHaveBeenCalledOnce();
  expect(api.generationForSong('new')).toBe('unified');
});
it('verification errors never cause fallback to a more permissive branch', async () => {
  const legacy = branch('old'),
    unified = branch('new');
  unified.restore.mockRejectedValue(Error('fresh_derived_record'));
  const api = createVersioned468Frontend({ legacy, unified });
  await expect(api.restore('old')).rejects.toThrow('fresh_derived_record');
  expect(legacy.restore).not.toHaveBeenCalled();
});
it('cross namespace identity collision is fatal, not last-write-wins', async () => {
  const api = createVersioned468Frontend({
    legacy: branch('same'),
    unified: branch('same'),
  });
  await expect(api.restoreCatalogViews()).rejects.toThrow(
    'versioned_identity_collision',
  );
});
it('session id routing cannot use video-only identity or malformed key', async () => {
  const legacy = branch('old'),
    unified = branch('new'),
    api = createVersioned468Frontend({ legacy, unified });
  await expect(api.restoreSession('old:garbage')).rejects.toThrow(
    'versioned_session_key',
  );
  expect(legacy.restore).not.toHaveBeenCalled();
  expect(unified.restore).not.toHaveBeenCalled();
});
it('enumeration retains all old/new sessions and confirms their owners', async () => {
  const api = createVersioned468Frontend({
    legacy: branch('old'),
    unified: branch('new'),
  });
  expect(await api.listSessions()).toEqual([{ song: 'old' }, { song: 'new' }]);
  expect(api.generationForSong('old')).toBe('legacy');
  expect(api.generationForSong('new')).toBe('unified');
});
it('restore returns only the first identity-checked result, never a second unchecked value', async () => {
  const legacy = branch('old'),
    unified = branch('new');
  unified.restore
    .mockResolvedValueOnce({ id: 'new' })
    .mockResolvedValueOnce({ id: 'imposter' });
  const api = createVersioned468Frontend({ legacy, unified });
  expect(await api.restore('new')).toEqual({ id: 'new' });
  expect(unified.restore).toHaveBeenCalledOnce();
});
it('source view cannot relabel an old identity as new', async () => {
  const legacy = branch('old'),
    unified = branch('new');
  unified.restoreSourceView.mockResolvedValue({ song: { id: 'old' } } as any);
  const api = createVersioned468Frontend({ legacy, unified });
  await expect(api.restoreSourceView({})).rejects.toThrow(
    'versioned_identity_collision',
  );
  expect(api.generationForSong('old')).not.toBe('unified');
});
it('direct restore and synchronous list both reject cross namespace identity collision', async () => {
  const legacy = branch('same'),
    unified = branch('same'),
    api = createVersioned468Frontend({ legacy, unified });
  await expect(api.restore('same')).rejects.toThrow(
    'versioned_identity_collision',
  );
  expect(() => api.list()).toThrow('versioned_identity_collision');
});
it('real request identity collision is rejected before unified pin can write', async () => {
  const extension = {
      videoId: 'v',
      audioSha256: 'a',
      baseChartSetSha256: 'c',
      extensionSha256: 'x',
    },
    id = 'yt-opus-v-a-cc-xx',
    legacy = branch(id),
    unified = branch('new'),
    api = createVersioned468Frontend({ legacy, unified });
  await expect(api.pin({ extension })).rejects.toThrow(
    'versioned_identity_collision',
  );
  expect(unified.pin).not.toHaveBeenCalled();
});
