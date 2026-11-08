import { expect, it, vi, afterEach } from 'vitest';
import raw from './fixtures/a16-server-response.json';
import { readCanonicalSource } from '../src/canonical-source-api';
import { readProgressiveManifest } from '../src/progressive-manifest-api';
afterEach(() => vi.unstubAllGlobals());
it('actual candidate record GET supplies anchor only after full record integrity gate', async () => {
  const record = JSON.parse(raw.recordBody);
  const requests: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      return url.endsWith('/progressive-manifest')
        ? Response.json(raw.manifestBody, { headers: raw.manifestHeaders })
        : new Response(raw.recordBody, { headers: raw.recordHeaders });
    }),
  );
  const lookup = await readCanonicalSource(record.videoId);
  expect(lookup.state).toBe('ready');
  if (lookup.state !== 'ready') throw Error('not ready');
  expect(lookup.record.manifestSha256).toBe(raw.manifestBody.manifestSha256);
  const anchor = {
    videoId: lookup.record.videoId,
    audioSha256: lookup.record.audioSha256,
    chartSetSha256: lookup.record.chartSetSha256!,
    manifestSha256: lookup.record.manifestSha256!,
  };
  const loaded = await readProgressiveManifest(lookup.record, anchor);
  expect(loaded?.manifest).toEqual(raw.manifestBody.manifest);
  expect(requests).toHaveLength(2);
});
it('record anchor tamper cannot pass original record response hash', async () => {
  const record = JSON.parse(raw.recordBody);
  record.manifestSha256 = '0'.repeat(64);
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(record), { headers: raw.recordHeaders }),
      ),
  );
  await expect(readCanonicalSource(record.videoId)).rejects.toMatchObject({
    code: 'integrity_failed',
  });
});
