vi.mock('../src/canonical-source-api', () => ({
  readCanonicalSource: vi.fn(),
}));
vi.mock('../src/canonical-audio-api', () => ({ loadCanonicalAudio: vi.fn() }));
import { readCanonicalSource } from '../src/canonical-source-api';
import { loadCanonicalAudio } from '../src/canonical-audio-api';
import { AudioJobError } from '../src/external-audio-api';
import { it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  readSharedAudio,
  recoverSharedAudio,
} from '../src/external-share-audio';
import { type ExternalSong } from '../src/external-catalog';
import { queryClient } from '../src/query-client';
beforeEach(() => queryClient.clear());
const store = vi.hoisted(() => ({
  local: vi.fn(async () => null),
  save: vi.fn(async () => {}),
}));
vi.mock('../src/external-local', () => ({
  localAudio: store.local,
  saveLocalAudio: store.save,
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  store.local.mockResolvedValue(null);
});
function item(jobId?: string) {
  return {
    song: { title: 'Original title' },
    record: {
      videoId: 'AAAAAAAAAAA',
      audioSha256: 'a'.repeat(64),
      frames: 48000,
      sampleRate: 48000,
      charts: { original: 'unchanged' },
    },
    jobId,
  } as unknown as ExternalSong;
}
for (const jobId of [undefined, 'expired-job'])
  it(`fresh viewer reads retained canonical audio with ${jobId ?? 'no job'}, preserving frozen charts`, async () => {
    const source = item(jobId),
      original = structuredClone(source.record),
      bytes = new ArrayBuffer(44);
    vi.mocked(readCanonicalSource).mockResolvedValue({
      state: 'ready',
      record: source.record,
      recordSha256: 'b'.repeat(64),
      audioCached: true,
    });
    vi.mocked(loadCanonicalAudio).mockResolvedValue(bytes);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await readSharedAudio(source)).toBe(bytes);
    expect(source.record).toEqual(original);
    expect(readCanonicalSource).not.toHaveBeenCalled();
    expect(loadCanonicalAudio).toHaveBeenCalledWith(
      source.record,
      expect.any(AbortSignal),
    );
    expect(store.save).toHaveBeenCalledWith(
      source.record,
      source.song.title,
      jobId,
      bytes,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
it('mismatched authoritative pin never substitutes audio or chart, never POSTs or saves', async () => {
  const source = item('expired-job'),
    original = structuredClone(source.record),
    fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  vi.mocked(loadCanonicalAudio).mockRejectedValue(
    new AudioJobError('source_changed'),
  );
  store.save.mockClear();
  await expect(readSharedAudio(source)).rejects.toMatchObject({
    code: 'source_changed',
  });
  expect(source.record).toEqual(original);
  expect(loadCanonicalAudio).toHaveBeenCalledWith(
    source.record,
    expect.any(AbortSignal),
  );
  expect(readCanonicalSource).not.toHaveBeenCalled();
  expect(store.save).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it('explicit recovery POSTs once, detects changed audio before accepting or saving and never regenerates', async () => {
  const fetch = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          jobId: 'new-job',
          status: 'done',
          audio: {
            sha256: 'b'.repeat(64),
            sizeBytes: 192044,
            contentType: 'audio/wav',
            durationSec: 1,
            contractVersion: 'audio/1',
            expiresAt: Date.now() + 50000,
          },
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal('fetch', fetch);
  const source = item('expired'),
    original = structuredClone(source.record);
  await expect(recoverSharedAudio(source)).rejects.toMatchObject({
    code: 'source_changed',
  });
  expect(fetch.mock.calls[0][1]?.method).toBe('POST');
  expect(source.bytes).toBeUndefined();
  expect(source.record).toEqual(original);
  expect(store.save).not.toHaveBeenCalled();
});
it('aborting queued explicit recovery never retries POST', async () => {
  const fetch = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          jobId: 'new-job',
          status: 'queued',
          retryAfterSec: 3,
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal('fetch', fetch);
  const controller = new AbortController();
  const work = recoverSharedAudio(item(), controller.signal);
  setTimeout(
    () => controller.abort(new DOMException('Aborted', 'AbortError')),
    5,
  );
  await expect(work).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetch).toHaveBeenCalledTimes(1);
});
