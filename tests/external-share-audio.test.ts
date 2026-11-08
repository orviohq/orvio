import { it, expect, vi, afterEach } from 'vitest';
import {
  readSharedAudio,
  recoverSharedAudio,
} from '../src/external-share-audio';
import { type ExternalSong } from '../src/external-catalog';
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
  vi.clearAllMocks();
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
it('no existing job means no fetch and no implicit audio request', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(readSharedAudio(item())).rejects.toMatchObject({
    code: 'audio_expired',
  });
  expect(fetch).not.toHaveBeenCalled();
});
it('expired existing job only GETs; never POSTs and retains the original chart/result', async () => {
  const fetch = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ error: { code: 'audio_expired' } }), {
        status: 410,
      }),
  );
  vi.stubGlobal('fetch', fetch);
  const source = item('old-job'),
    original = structuredClone(source.record);
  await expect(readSharedAudio(source)).rejects.toMatchObject({
    code: 'audio_expired',
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toContain('/old-job');
  expect(source.record).toEqual(original);
  expect(store.save).not.toHaveBeenCalled();
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
