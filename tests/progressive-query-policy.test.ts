import { it, expect, vi, afterEach } from 'vitest';
import { readProgressiveManifest } from '../src/progressive-manifest-api';
import { beginProgressivePlayback } from '../src/progressive-playback';
import { queryClient, shouldPersistQuery } from '../src/query-client';
import { progressiveFixture } from './progressive-fixture';
const record: any = {
  videoId: 'AAAAAAAAAAA',
  audioSha256: 'a'.repeat(64),
  chartSetSha256: 'b'.repeat(64),
};
const anchor = { ...record, manifestSha256: 'c'.repeat(64) };
afterEach(() => {
  queryClient.clear();
  vi.unstubAllGlobals();
});
it('manifest JSON uses independent per-call queries, not a shared consumable response or first-caller signal', async () => {
  const f = vi.fn(async () =>
    Response.json({ ...anchor, manifest: { parts: [] } }),
  );
  vi.stubGlobal('fetch', f);
  const values = await Promise.all([
    readProgressiveManifest(record, anchor, new AbortController().signal),
    readProgressiveManifest(record, anchor, new AbortController().signal),
  ]);
  expect(values[0]).toEqual(values[1]);
  expect(f).toHaveBeenCalledTimes(2);
  const q = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['progressive-manifest'] });
  expect(q).toHaveLength(2);
  expect(q.every((q) => !shouldPersistQuery(q))).toBe(true);
  await new Promise((r) => setTimeout(r, 10));
  expect(
    queryClient.getQueryCache().findAll({ queryKey: ['progressive-manifest'] }),
  ).toHaveLength(0);
});
it('failed manifest GET is not retried and an already-aborted caller makes zero requests', async () => {
  const f = vi.fn(async () => new Response('{}', { status: 503 }));
  vi.stubGlobal('fetch', f);
  await expect(readProgressiveManifest(record, anchor)).rejects.toMatchObject({
    code: 'unavailable',
  });
  expect(f).toHaveBeenCalledTimes(1);
  const c = new AbortController();
  c.abort();
  await expect(
    readProgressiveManifest(record, anchor, c.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(f).toHaveBeenCalledTimes(1);
});
function context() {
  return {
    createGain: () => ({ gain: { value: 0 }, connect: () => {} }),
    resume: async () => {},
    state: 'running',
  } as any;
}
it('pre-aborted progressive run does no canonical, manifest or audio GET', async () => {
  const fixture = await progressiveFixture(),
    f = vi.fn();
  vi.stubGlobal('fetch', f);
  const c = new AbortController();
  c.abort();
  const run = beginProgressivePlayback(
    fixture.record,
    context(),
    0.15,
    c.signal,
  );
  await expect(run.done).rejects.toMatchObject({ name: 'AbortError' });
  expect(f).not.toHaveBeenCalled();
});
it('simultaneous progressive runs have independent audio GET ownership and never retry failed streams', async () => {
  const fixture = await progressiveFixture();
  let audio = 0;
  vi.stubGlobal('fetch', async (input: any) => {
    const u = String(input);
    if (u.endsWith('/audio')) {
      audio++;
      throw Error('fixture audio failure');
    }
    return u.endsWith('/progressive-manifest')
      ? Response.json(fixture.manifestBody)
      : new Response(fixture.recordBody, { headers: fixture.recordHeaders });
  });
  const a = beginProgressivePlayback(
      fixture.record,
      context(),
      0.15,
      new AbortController().signal,
    ),
    b = beginProgressivePlayback(
      fixture.record,
      context(),
      0.15,
      new AbortController().signal,
    );
  await Promise.all([
    expect(a.done).rejects.toThrow('fixture audio failure'),
    expect(b.done).rejects.toThrow('fixture audio failure'),
  ]);
  expect(audio).toBe(2);
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['progressive-play'] });
  expect(queries).toHaveLength(2);
  expect(
    queries.every((q) => q.state.data === undefined && !shouldPersistQuery(q)),
  ).toBe(true);
});
