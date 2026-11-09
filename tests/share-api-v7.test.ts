import { beforeEach, afterEach, expect, test, vi } from 'vitest';
vi.mock('../src/query-client', () => ({
  queryClient: { fetchQuery: vi.fn() },
  queryKeys: { sharedReplay: (id: string) => ['shared', id] },
  runMutation: (_key: unknown, fn: () => Promise<unknown>) => fn(),
}));
import { saveSharedReplay } from '../src/share-api';
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({
      id: 'abcdefghijklmnopqrstuvwx',
      expiresAt: '2027-11-09T00:00:00Z',
    }),
  });
});
afterEach(() => vi.unstubAllGlobals());
test.each(['v=4&score=1', 'v=5&d=abc', 'v=6&d=abc'])(
  'old %s retains exact application/json header',
  async (fragment) => {
    await saveSharedReplay(fragment);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
    });
  },
);
test('new v7 only uses untrusted Content-Type routing hint with same endpoint', async () => {
  await saveSharedReplay('v=7&d=abc');
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://orvio-share.pn-26f.workers.dev/v1/replays',
  );
  expect(fetchMock.mock.calls[0][1].headers).toEqual({
    'Content-Type': 'application/json; orvio-share-version=7',
  });
});
test('v7 permits existing699058 ceiling without widening unknown versions', async () => {
  await saveSharedReplay('v=7&d=' + 'a'.repeat(200000));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await expect(
    saveSharedReplay('v=8&d=' + 'a'.repeat(200000)),
  ).rejects.toMatchObject({ status: 413 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test('oversized v7 never sends', async () => {
  await expect(
    saveSharedReplay('v=7&d=' + 'a'.repeat(699058)),
  ).rejects.toMatchObject({ status: 413 });
  expect(fetchMock).not.toHaveBeenCalled();
});
test('caller abort is composed with existing12s request deadline', async () => {
  const c = new AbortController();
  await saveSharedReplay('v=7&d=abc', { signal: c.signal });
  const outgoing = fetchMock.mock.calls[0][1].signal;
  expect(outgoing.aborted).toBe(false);
  c.abort();
  expect(outgoing.aborted).toBe(true);
});
