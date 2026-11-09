import { beforeEach, expect, test, vi } from 'vitest';
vi.mock('../src/opus/opus-record', () => ({
  verifyOpusRecord: vi.fn(async () => true),
}));
vi.mock('../src/opus/opus-descriptor.mjs', () => ({
  parseVerifiedDescriptor: vi.fn(async () => ({})),
}));
vi.mock('../src/opus/opus-cache.mjs', () => ({
  readVerifiedOpusByRoots: vi.fn(async () => null),
}));
vi.mock('../src/opus/opus35-api', () => ({
  restoreOpus35Record: vi.fn(async () => new ArrayBuffer(0)),
}));
import { recoverPublic468Source } from '../src/opus/opus468-share-recovery';
import { verifyOpusRecord } from '../src/opus/opus-record';
import { readVerifiedOpusByRoots } from '../src/opus/opus-cache.mjs';
import { restoreOpus35Record } from '../src/opus/opus35-api';
const base = {
  version: 2,
  videoId: 'abcdefghijk',
  audioSha256: 'a'.repeat(64),
  encodedAudioSha256: 'b'.repeat(64),
  audioDescriptorSha256: 'c'.repeat(64),
  decoderWasmSha256: 'd'.repeat(64),
  sampleRate: 48000,
  frames: 120,
};
const candidate = () => ({
  baseSourceRecordJson: JSON.stringify(base),
  descriptorBytes: new Uint8Array([1]),
});
const exchange = vi.fn(async (q: any) => ({
  ...base,
  ok: true,
  requestId: q.requestId,
  channels: 2,
  currentAtConfirmation: true,
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(verifyOpusRecord).mockResolvedValue(true);
  vi.mocked(readVerifiedOpusByRoots).mockResolvedValue(null);
  exchange.mockImplementation(async (q: any) => ({
    ...base,
    ok: true,
    requestId: q.requestId,
    channels: 2,
    currentAtConfirmation: true,
  }));
});
test('verified roots and fresh matching nonce precede cache-only recovery', async () => {
  const signal = new AbortController().signal;
  await recoverPublic468Source(candidate(), {
    exchangeProjection: exchange,
    signal,
  });
  expect(exchange).toHaveBeenCalledTimes(1);
  expect(exchange.mock.calls[0][0].requestId).toMatch(/^[a-f0-9]{64}$/);
  expect(restoreOpus35Record).toHaveBeenCalledWith(base, signal);
});
test('each recovery asks for a new nonce even on cache hit', async () => {
  vi.mocked(readVerifiedOpusByRoots).mockResolvedValue({ record: base });
  for (let i = 0; i < 2; i++)
    await recoverPublic468Source(candidate(), {
      exchangeProjection: exchange,
      signal: new AbortController().signal,
    });
  expect(exchange.mock.calls[0][0].requestId).not.toEqual(
    exchange.mock.calls[1][0].requestId,
  );
  expect(restoreOpus35Record).not.toHaveBeenCalled();
});
test.each([
  'audioSha256',
  'audioDescriptorSha256',
  'decoderWasmSha256',
  'encodedAudioSha256',
  'requestId',
  'frames',
  'channels',
  'currentAtConfirmation',
])('changed %s denies before any cache/audio read', async (key) => {
  exchange.mockImplementation(async (q: any) => ({
    ...base,
    ok: true,
    requestId: q.requestId,
    channels: 2,
    currentAtConfirmation: true,
    [key]: 'wrong',
  }));
  await expect(
    recoverPublic468Source(candidate(), {
      exchangeProjection: exchange,
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('source_unavailable');
  expect(readVerifiedOpusByRoots).not.toHaveBeenCalled();
  expect(restoreOpus35Record).not.toHaveBeenCalled();
});
test('invalid base is not looked up or retrieved', async () => {
  vi.mocked(verifyOpusRecord).mockResolvedValue(false);
  await expect(
    recoverPublic468Source(candidate(), {
      exchangeProjection: exchange,
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('source_record');
  expect(exchange).not.toHaveBeenCalled();
});
test('abort after projection never starts source retrieval', async () => {
  const c = new AbortController();
  exchange.mockImplementation(async (q: any) => {
    c.abort(Error('cancelled'));
    return {
      ...base,
      ok: true,
      requestId: q.requestId,
      channels: 2,
      currentAtConfirmation: true,
    };
  });
  await expect(
    recoverPublic468Source(candidate(), {
      exchangeProjection: exchange,
      signal: c.signal,
    }),
  ).rejects.toThrow('cancelled');
  expect(readVerifiedOpusByRoots).not.toHaveBeenCalled();
});
