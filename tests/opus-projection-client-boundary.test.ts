import { expect, it, vi } from 'vitest';
import { createPrivateOpusV2ProjectionTransport } from '../src/opus/opus-projection-client-boundary';
import { ClientOnlyNetworkError } from '../src/client-only-runtime';

const validRequest = {
  version: 1 as const,
  requestId: 'a'.repeat(64),
  videoId: 'AAAAAAAAAAA',
  encodedAudioSha256: 'a'.repeat(64),
};

function createFetchSpy() {
  return vi.fn(async () => {
    throw new Error('fetchImpl must never be called');
  });
}

it('does not fetch when constructing the transport', () => {
  const fetchImpl = createFetchSpy();
  createPrivateOpusV2ProjectionTransport({ fetchImpl });
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('blocks a valid request with ClientOnlyNetworkError before fetching', async () => {
  const fetchImpl = createFetchSpy();
  const transport = createPrivateOpusV2ProjectionTransport({ fetchImpl });
  await expect(async () => await transport.exchange(validRequest)).rejects.toBeInstanceOf(
    ClientOnlyNetworkError,
  );
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('throws the exact already-aborted signal reason without fetching', async () => {
  const fetchImpl = createFetchSpy();
  const transport = createPrivateOpusV2ProjectionTransport({ fetchImpl });
  const controller = new AbortController();
  const reason = new Error('pre-abort marker');
  controller.abort(reason);
  await expect(
    async () => await transport.exchange(validRequest, { signal: controller.signal }),
  ).rejects.toBe(reason);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it('never fetches for a malformed request', async () => {
  const fetchImpl = createFetchSpy();
  const transport = createPrivateOpusV2ProjectionTransport({ fetchImpl });
  await expect(
    async () => await transport.exchange({} as Parameters<typeof transport.exchange>[0]),
  ).rejects.toThrow();
  expect(fetchImpl).not.toHaveBeenCalled();
});
