import { it, expect, vi } from 'vitest';
import { createCurrentOpus468Bridge } from '../src/opus/opus468-current-entry-bridge';
const song = {
  id: 'private-song',
  title: 'Private',
  subtitle: 'YouTube',
  bpm: 120,
  root: 57,
  scale: [0],
  color: '#29d8ff',
  genre: 'YOUTUBE',
  bars: 0,
};
function fixture() {
  const engine = { exactEngine: true },
    audio = { exactAudio: true },
    view = {
      song,
      seconds: 12,
      charts: { '4:low': { notes: [{ id: 0, time: 1, lane: 0 }] } },
    };
  const service = {
    restoreCatalog: vi.fn(async () => []),
    list: () => [song],
    catalogView: vi.fn(async () => view),
    play: vi.fn(async () => ({
      song,
      audio,
      engine,
      identity: { song: song.id },
    })),
    readSession: vi.fn(async () => ({ engine: { sessionEngine: true } })),
  };
  return { service, engine, audio };
}
it('attaches verified views atomically, clones display notes and transfers exact prepared engine/audio', async () => {
  const f = fixture(),
    bridge = createCurrentOpus468Bridge();
  expect(bridge.owns(song.id)).toBe(false);
  await bridge.attach(f.service as any);
  expect(bridge.owns(song.id)).toBe(true);
  const notes = bridge.chart(song.id, 4, 'low')!;
  notes[0].lane = 3;
  expect(bridge.chart(song.id, 4, 'low')![0].lane).toBe(0);
  const got = await bridge.prepare({
    song: song.id,
    lanes: 4,
    difficulty: 'low',
    shuffle: 'off',
    seed: 1,
    context: {} as any,
    present: () => {},
  });
  expect(got.buffer).toBe(f.audio);
  expect(got.engine).toBe(f.engine);
});
it('failed catalog restore exposes no partial song and unknown songs cannot use fallback playback', async () => {
  const f = fixture(),
    bridge = createCurrentOpus468Bridge();
  f.service.catalogView.mockRejectedValueOnce(Error('hash mismatch'));
  await expect(bridge.attach(f.service as any)).rejects.toThrow(
    'hash mismatch',
  );
  expect(bridge.owns(song.id)).toBe(false);
  await expect(
    bridge.prepare({
      song: song.id,
      lanes: 4,
      difficulty: 'low',
      shuffle: 'off',
      seed: 1,
      context: {} as any,
      present: () => {},
    }),
  ).rejects.toThrow('extension_not_restored');
  expect(f.service.play).not.toHaveBeenCalled();
});
it('cancel during attach cannot install stale catalog views', async () => {
  const f = fixture(),
    bridge = createCurrentOpus468Bridge();
  let finish!: () => void;
  f.service.restoreCatalog.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = () => r([]);
      }),
  );
  const wait = bridge.attach(f.service as any);
  bridge.cancel();
  finish();
  await expect(wait).rejects.toThrow('extension_entry_stale');
  expect(bridge.owns(song.id)).toBe(false);
});
it('cancellation after audio while replay-session validation awaits cannot transfer an engine', async () => {
  const f = fixture(),
    bridge = createCurrentOpus468Bridge();
  await bridge.attach(f.service as any);
  let release!: (v: any) => void;
  f.service.readSession.mockImplementationOnce(
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  const pending = bridge.prepare(
    {
      song: song.id,
      lanes: 4,
      difficulty: 'low',
      shuffle: 'off',
      seed: 1,
      context: {} as any,
      present: () => {},
    },
    { replaySession: 'session' },
  );
  await vi.waitFor(() => expect(f.service.readSession).toHaveBeenCalled());
  bridge.cancel();
  release({ engine: { stale: true } });
  await expect(pending).rejects.toThrow('extension_entry_stale');
});
it('replay transfers exact validated session engine while retaining exact decoded audio', async () => {
  const f = fixture(),
    bridge = createCurrentOpus468Bridge();
  await bridge.attach(f.service as any);
  const replayEngine = { validated: true };
  f.service.readSession.mockResolvedValueOnce({ engine: replayEngine } as any);
  const prepared = await bridge.prepare(
    {
      song: song.id,
      lanes: 4,
      difficulty: 'low',
      shuffle: 'mirror',
      seed: 55,
      context: {} as any,
      present: () => {},
    },
    { replaySession: 'session' },
  );
  expect(prepared.buffer).toBe(f.audio);
  expect(prepared.engine).toBe(replayEngine);
});
it('display uses a stable count/metadata projection, separate from cloned playback notes', async () => {
  const f = fixture(),
    bridge = createCurrentOpus468Bridge();
  await bridge.attach(f.service as any);
  const display = bridge.display(song.id, 4, 'low');
  expect(display?.count).toBe(1);
  expect(bridge.display(song.id, 4, 'low')).toBe(display);
  expect(bridge.display(song.id, 5, 'low')?.count).toBe(0);
  expect(bridge.display('unknown', 4, 'low')).toBeUndefined();
  bridge.chart(song.id, 4, 'low')![0].lane = 3;
  expect(bridge.display(song.id, 4, 'low')).toBe(display);
});
it('single-song attach validates only target and preserves existing verified view, rejects stale response', async () => {
  const f = fixture(),
    bridge = createCurrentOpus468Bridge();
  await bridge.attachSong(f.service as any, song.id);
  expect(f.service.restoreCatalog).not.toHaveBeenCalled();
  expect(f.service.catalogView).toHaveBeenCalledTimes(1);
  expect(bridge.owns(song.id)).toBe(true);
  let release!: (v: any) => void;
  f.service.catalogView.mockImplementationOnce(
    () => new Promise((r) => (release = r)),
  );
  const work = bridge.attachSong(f.service as any, song.id);
  bridge.cancel();
  release({ song, seconds: 12, charts: {} });
  await expect(work).rejects.toThrow('extension_entry_stale');
  expect(bridge.chart(song.id, 4, 'low')?.length).toBe(1);
});
it('saved source METHOD call uses exact verified returned view, null is absent and errors never become new admission', async () => {
  const f = fixture(),
    bridge = createCurrentOpus468Bridge();
  let correctThis = false;
  const service = {
    ...f.service,
    async restoreSourceView() {
      correctThis = this === service;
      return {
        song,
        seconds: 12,
        charts: { '4:low': { notes: [{ id: 0, time: 1, lane: 0 }] } },
      };
    },
  };
  expect(await bridge.attachSource(service as any, {} as any)).toEqual([song]);
  expect(correctThis).toBe(true);
  expect(f.service.catalogView).not.toHaveBeenCalled();
  const absent = createCurrentOpus468Bridge();
  expect(
    await absent.attachSource(
      {
        ...service,
        async restoreSourceView() {
          return null;
        },
      } as any,
      {} as any,
    ),
  ).toBeNull();
  expect(absent.owns(song.id)).toBe(false);
  await expect(
    createCurrentOpus468Bridge().attachSource(
      {
        ...service,
        async restoreSourceView() {
          throw Error('extension_saved_source_conflict');
        },
      } as any,
      {} as any,
    ),
  ).rejects.toThrow('extension_saved_source_conflict');
});
