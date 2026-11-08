import { it, expect, vi } from 'vitest';
import { loadAudio, type AudioJob } from '../src/external-audio-api';
const bytes = new Uint8Array(44),
  hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
const job: AudioJob = {
  jobId: 'existing-job',
  status: 'done',
  audio: {
    sha256: hash,
    sizeBytes: 44,
    contentType: 'audio/wav',
    durationSec: 137,
    contractVersion: 'audio/1',
    expiresAt: 1794706332082,
  },
};
const fresh = () =>
  new Response(
    JSON.stringify({ error: { code: 'unavailable', retryAfterSec: 10 } }),
    { status: 409 },
  );
const audio = () =>
  new Response(bytes, {
    headers: {
      'Content-Type': 'audio/wav',
      'X-Content-SHA256': hash,
      'X-Source-Video-Id': 'I_DocC3srzY',
      'X-Audio-Contract': 'audio/1',
    },
  });
it('retries only the same existing GET after the server delay, then checks exact bytes', async () => {
  vi.useFakeTimers();
  const mock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(fresh())
    .mockResolvedValueOnce(audio());
  try {
    const work = loadAudio(job, 'I_DocC3srzY');
    await vi.advanceTimersByTimeAsync(9999);
    expect(mock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(new Uint8Array(await work)).toEqual(bytes);
    expect(mock).toHaveBeenCalledTimes(2);
    for (const [url, init] of mock.mock.calls) {
      expect(url).toContain('/existing-job/audio');
      expect(init?.method).toBeUndefined();
    }
  } finally {
    mock.mockRestore();
    vi.useRealTimers();
  }
});
it('caps fresh propagation wait at 90 seconds without any POST', async () => {
  vi.useFakeTimers();
  const mock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => fresh());
  try {
    const checked = expect(loadAudio(job, 'I_DocC3srzY')).rejects.toMatchObject(
      { code: 'request_timeout' },
    );
    await vi.advanceTimersByTimeAsync(90000);
    await checked;
    expect(mock).toHaveBeenCalledTimes(10);
    expect(
      mock.mock.calls.every(([, init]) => init?.method === undefined),
    ).toBe(true);
  } finally {
    mock.mockRestore();
    vi.useRealTimers();
  }
});
it('410 expires immediately without retry, and abort stops a fresh wait', async () => {
  vi.useFakeTimers();
  const mock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response('{}', { status: 410 }))
    .mockResolvedValueOnce(fresh());
  try {
    await expect(loadAudio(job, 'I_DocC3srzY')).rejects.toMatchObject({
      code: 'audio_expired',
    });
    expect(mock).toHaveBeenCalledTimes(1);
    const controller = new AbortController(),
      checked = expect(
        loadAudio(job, 'I_DocC3srzY', undefined, controller.signal),
      ).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(1);
    controller.abort();
    await checked;
    await vi.advanceTimersByTimeAsync(100000);
    expect(mock).toHaveBeenCalledTimes(2);
  } finally {
    mock.mockRestore();
    vi.useRealTimers();
  }
});
