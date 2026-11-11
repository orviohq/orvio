import { it, expect, vi, afterEach } from 'vitest';
const m = vi.hoisted(() => ({
  restore: vi.fn(),
  saveLocal: vi.fn(),
  local: vi.fn(),
  saveMeta: vi.fn(),
  remember: vi.fn(),
  hiddenIds: vi.fn(),
  saveHidden: vi.fn(),
  addOrder: vi.fn(),
  loadCanonical: vi.fn(),
  readArtifact: vi.fn(),
  sourceId: vi.fn((record: any) => 'id:' + record.videoId),
}));
vi.mock('../src/opus/opus35-api', () => ({
  restoreOpus35Record: m.restore,
  readOpus35Artifact: m.readArtifact,
}));
vi.mock('../src/external-local', () => ({
  saveLocalAudio: m.saveLocal,
  localAudio: m.local,
  saveSongMetadata: m.saveMeta,
}));
vi.mock('../src/canonical-library', () => ({ rememberCanonical: m.remember }));
vi.mock('../src/library-removal', () => ({
  hiddenLibraryIds: m.hiddenIds,
  saveHiddenLibraryIds: m.saveHidden,
}));
vi.mock('../src/library-add-order', () => ({
  LibraryAddOrder: class {
    added(id: string) {
      return m.addOrder(id);
    }
  },
}));
vi.mock('../src/external-catalog', () => ({ sourceId: m.sourceId }));
vi.mock('../src/canonical-audio-api', () => ({
  loadCanonicalAudio: m.loadCanonical,
}));
import { addSharedSong } from '../src/song-share';
import {
  SONG_SHARE_SAVE_CAUSES,
  SONG_SHARE_SAVE_STAGES,
  SongShareSaveError,
  songShareBodyAtStage,
  songShareFetchAtStage,
  songShareSaveAtStage,
} from '../src/song-share-save-diagnostic';
import { readStableOpus35Artifacts } from '../src/opus/opus35-stable';
const opus = {
  kind: 'opus35-song' as const,
  record: { videoId: 'AAAAAAAAAAA', version: 2 },
  metadata: { title: 'title', author: null },
  descriptorBytes: new Uint8Array(),
};
const legacy = {
  record: { videoId: 'AAAAAAAAAAA' },
  metadata: { title: 'title', author: null },
  recordSha256: 'a'.repeat(64),
} as any;
function storage() {
  vi.stubGlobal('localStorage', {
    getItem: () => '[]',
    setItem: () => {},
  });
}
function reset() {
  vi.clearAllMocks();
  m.restore.mockResolvedValue(new ArrayBuffer(4));
  m.saveLocal.mockResolvedValue(undefined);
  m.local.mockResolvedValue(null);
  m.loadCanonical.mockResolvedValue(new ArrayBuffer(4));
  m.readArtifact.mockReset();
  m.saveMeta.mockResolvedValue(undefined);
  m.remember.mockResolvedValue(undefined);
  m.hiddenIds.mockReturnValue(new Set());
  m.saveHidden.mockReturnValue(undefined);
  m.addOrder.mockReturnValue(undefined);
}
afterEach(() => {
  vi.unstubAllGlobals();
  reset();
});
it('uses only the enumerated stages and exposes no underlying message', async () => {
  const secret = 'https://example.test/watch?v=AAAAAAAAAAA token=secret';
  expect(SONG_SHARE_SAVE_STAGES).toEqual([
    'descriptor_fetch',
    'audio_fetch',
    'artifact_verify',
    'decoder_fetch',
    'decoder_verify',
    'worker_decode',
    'cache_write',
    'local_save',
    'visibility_write',
    'order_write',
  ]);
  for (const stage of SONG_SHARE_SAVE_STAGES) {
    const error = await songShareSaveAtStage(stage, () => {
      throw Error(secret);
    }).catch((e) => e);
    expect(error).toBeInstanceOf(SongShareSaveError);
    expect(error).toMatchObject({ stage });
    expect(SONG_SHARE_SAVE_CAUSES).toContain(error.cause);
    expect(error.message).not.toContain('example.test');
    expect(error.message).not.toContain('AAAAAAAAAAA');
    expect(error.message).not.toContain('secret');
  }
});
it('programming TypeErrors stay unknown outside fetch boundaries', async () => {
  expect(
    (
      await songShareSaveAtStage('local_save', () => {
        throw new TypeError('unexpected programming error');
      }).catch((e) => e)
    ).cause,
  ).toBe('unknown');
});
it('distinguishes actual fetch/body boundaries, HTTP, integrity, storage and aborts', async () => {
  expect(
    (
      await songShareFetchAtStage('audio_fetch', async () => {
        throw new TypeError('fetch failed');
      }).catch((e) => e)
    ).cause,
  ).toBe('connection');
  expect(
    (
      await songShareBodyAtStage('decoder_verify', async () => {
        throw new TypeError('body read failed');
      }).catch((e) => e)
    ).cause,
  ).toBe('connection');
  expect(
    (
      await songShareFetchAtStage(
        'audio_fetch',
        async () => new Response(null, { status: 503 }),
      ).catch((e) => e)
    )
  ).toMatchObject({ stage: 'audio_fetch', cause: 'http' });
  expect(
    (
      await songShareSaveAtStage('artifact_verify', () => {
        throw Error('opus35_stable_headers');
      }).catch((e) => e)
    ).cause,
  ).toBe('integrity');
  expect(
    (
      await songShareSaveAtStage('artifact_verify', () => {
        throw Error('hash mismatch');
      }).catch((e) => e)
    ).cause,
  ).toBe('unknown');
  expect(
    (
      await songShareSaveAtStage('local_save', () => {
        throw new DOMException('quota', 'QuotaExceededError');
      }).catch((e) => e)
    ).cause,
  ).toBe('quota');
  expect(
    (
      await songShareSaveAtStage('worker_decode', () => {
        throw new DOMException('stop', 'AbortError');
      }).catch((e) => e)
    ).cause,
  ).toBe('aborted');
});
it('actual stable wrapper maps header and body failures without integrity guesses', async () => {
  const record = {
    videoId: 'AAAAAAAAAAA',
    audioSha256: 'a'.repeat(64),
    audioDescriptorSha256: 'b'.repeat(64),
    encodedAudioSha256: 'c'.repeat(64),
  } as any;
  await expect(
    readStableOpus35Artifacts(
      record,
      new Response('bad', { headers: {} }),
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ stage: 'artifact_verify', cause: 'integrity' });
  const headers = new Headers({
    'Content-Length': '4',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Audio-Contract': 'orvio-opus-v1',
    'X-PCM16-SHA256': record.audioSha256,
    'X-Content-SHA256': record.audioDescriptorSha256,
    'X-Descriptor-SHA256': record.audioDescriptorSha256,
    'X-Source-Video-Id': record.videoId,
    ETag: '"' + record.audioDescriptorSha256 + '"',
  });
  const body = {
    getReader: () => ({
      read: async () => {
        throw new TypeError('body network rejection');
      },
      cancel: async () => {},
    }),
  };
  await expect(
    readStableOpus35Artifacts(
      record,
      { status: 200, redirected: false, headers, body } as any,
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ stage: 'artifact_verify', cause: 'connection' });
});
it('opus restore failures stop before any local or list write', async () => {
  storage();
  for (const stage of [
    'descriptor_fetch',
    'audio_fetch',
    'artifact_verify',
    'decoder_fetch',
    'decoder_verify',
    'worker_decode',
    'cache_write',
  ] as const) {
    reset();
    storage();
    m.restore.mockRejectedValueOnce(
      new SongShareSaveError(stage, 'integrity'),
    );
    await expect(addSharedSong(opus as any)).rejects.toMatchObject({
      stage,
      cause: 'integrity',
    });
    expect(m.restore).toHaveBeenCalledTimes(1);
    expect(m.saveLocal).not.toHaveBeenCalled();
    expect(m.saveHidden).not.toHaveBeenCalled();
    expect(m.addOrder).not.toHaveBeenCalled();
  }
});
it('a partial write after local save reports the later stage and does not invent rollback', async () => {
  storage();
  m.saveHidden.mockImplementationOnce(() => {
    throw new DOMException('quota', 'QuotaExceededError');
  });
  await expect(addSharedSong(opus as any)).rejects.toMatchObject({
    stage: 'visibility_write',
    cause: 'quota',
  });
  expect(m.saveLocal).toHaveBeenCalledTimes(1);
  expect(m.addOrder).not.toHaveBeenCalled();
});
it('order_write failure is observed only after local and visibility writes', async () => {
  storage();
  m.addOrder.mockImplementationOnce(() => {
    throw new DOMException('quota', 'QuotaExceededError');
  });
  await expect(addSharedSong(opus as any)).rejects.toMatchObject({
    stage: 'order_write',
    cause: 'quota',
  });
  expect(m.saveLocal).toHaveBeenCalledTimes(1);
  expect(m.saveHidden).toHaveBeenCalledTimes(1);
});
it('success returns only after every gate and never originates an extraction', async () => {
  storage();
  expect(await addSharedSong(opus as any)).toBe('id:AAAAAAAAAAA');
  expect(m.restore).toHaveBeenCalledTimes(1);
  expect(m.saveLocal).toHaveBeenCalledTimes(1);
  expect(m.saveHidden).toHaveBeenCalledTimes(1);
  expect(m.addOrder).toHaveBeenCalledTimes(1);
});
it('legacy shared links keep their path and report the failing local stage', async () => {
  storage();
  m.saveMeta.mockRejectedValueOnce(
    new DOMException('quota', 'QuotaExceededError'),
  );
  await expect(addSharedSong(legacy)).rejects.toMatchObject({
    stage: 'local_save',
    cause: 'quota',
  });
  expect(m.saveLocal).toHaveBeenCalledTimes(1);
  expect(m.remember).not.toHaveBeenCalled();
  expect(m.saveHidden).not.toHaveBeenCalled();
  expect(m.addOrder).not.toHaveBeenCalled();
});
