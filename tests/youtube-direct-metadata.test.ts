import { afterEach, expect, it, vi } from 'vitest';
import { readDirectYoutubeMetadata } from '../src/youtube-direct-metadata';
const id = 'IMWT6937uUs';
const signal = () => new AbortController().signal;
afterEach(() => vi.useRealTimers());
it('uses the documented direct metadata route with omitted credentials and bounded display fields', async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      id,
      title: ' Song ',
      channel: ' Channel ',
      uploader: 'Other',
    }),
  );
  expect(
    await readDirectYoutubeMetadata(id, {
      publicKey: 'public-test',
      signal: signal(),
      fetch: fetcher,
    }),
  ).toEqual({ title: 'Song', author: 'Channel' });
  expect(fetcher).toHaveBeenCalledWith(
    `https://provider.fixture.invalid/v1/videos/${id}`,
    expect.objectContaining({
      method: 'GET',
      credentials: 'omit',
      redirect: 'error',
      headers: { Authorization: 'Bearer public-test' },
    }),
  );
});
it.each([
  { id: 'AAAAAAAAAAA', title: 'Wrong' },
  { id, title: null },
  { id, title: '' },
])('rejects invalid metadata %j', async (body) => {
  expect(
    await readDirectYoutubeMetadata(id, {
      publicKey: 'public-test',
      signal: signal(),
      fetch: vi.fn(async () => Response.json(body)),
    }),
  ).toBeNull();
});
it('falls back to uploader and bounds strings', async () => {
  expect(
    await readDirectYoutubeMetadata(id, {
      publicKey: 'public-test',
      signal: signal(),
      fetch: vi.fn(async () =>
        Response.json({
          id,
          title: 'a'.repeat(400),
          uploader: 'b'.repeat(200),
        }),
      ),
    }),
  ).toEqual({ title: 'a'.repeat(300), author: 'b'.repeat(100) });
});
it('metadata network or auth failure never throws into the audio pipeline', async () => {
  for (const fetcher of [
    vi.fn(async () => {
      throw Error('offline');
    }),
    vi.fn(async () => new Response(null, { status: 401 })),
  ])
    expect(
      await readDirectYoutubeMetadata(id, {
        publicKey: 'public-test',
        signal: signal(),
        fetch: fetcher,
      }),
    ).toBeNull();
});
it('bounds an uncooperative request without retry', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
  const pending = readDirectYoutubeMetadata(id, {
    publicKey: 'public-test',
    signal: signal(),
    fetch: fetcher,
  });
  await vi.advanceTimersByTimeAsync(8000);
  expect(await pending).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![1]!.signal!.aborted).toBe(true);
});
it('never fetches for missing key or pre-aborted caller', async () => {
  const fetcher = vi.fn();
  for (const options of [
    { publicKey: '', signal: signal() },
    { publicKey: 'public-test', signal: AbortSignal.abort() },
  ])
    expect(
      await readDirectYoutubeMetadata(id, { ...options, fetch: fetcher }),
    ).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
