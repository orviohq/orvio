import { afterEach, expect, it, vi } from 'vitest';
import { readProgressiveManifest } from '../src/progressive-manifest-api';
const record: any = {
  videoId: 'AAAAAAAAAAA',
  audioSha256: 'a'.repeat(64),
  chartSetSha256: 'b'.repeat(64),
};
const anchor = { ...record, manifestSha256: 'c'.repeat(64) };
afterEach(() => vi.unstubAllGlobals());
it('legacy record skips manifest network and retains whole-file path', async () => {
  const f = vi.fn();
  vi.stubGlobal('fetch', f);
  expect(await readProgressiveManifest(record)).toBeNull();
  expect(f).not.toHaveBeenCalled();
});
it('rejects mismatching anchor before network', async () => {
  const f = vi.fn();
  vi.stubGlobal('fetch', f);
  await expect(
    readProgressiveManifest(record, { ...anchor, audioSha256: 'd'.repeat(64) }),
  ).rejects.toMatchObject({ code: 'integrity_failed' });
  expect(f).not.toHaveBeenCalled();
});
it('accepts exact envelope only with externally supplied anchor', async () => {
  const f = vi
    .fn()
    .mockResolvedValue(Response.json({ ...anchor, manifest: { parts: [] } }));
  vi.stubGlobal('fetch', f);
  expect((await readProgressiveManifest(record, anchor))?.anchor).toEqual(
    anchor,
  );
  expect(f.mock.calls[0][1].method).toBeUndefined();
});
it('does not trust a swapped manifest response hash', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        ...anchor,
        manifestSha256: 'd'.repeat(64),
        manifest: {},
      }),
    ),
  );
  await expect(readProgressiveManifest(record, anchor)).rejects.toMatchObject({
    code: 'integrity_failed',
  });
});
it('missing bound manifest does not silently downgrade', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{}', { status: 404 })),
  );
  await expect(readProgressiveManifest(record, anchor)).rejects.toMatchObject({
    code: 'integrity_failed',
  });
});
it('bounds response body independently of advertised length', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(' '.repeat(262145), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  await expect(readProgressiveManifest(record, anchor)).rejects.toMatchObject({
    code: 'integrity_failed',
  });
});
