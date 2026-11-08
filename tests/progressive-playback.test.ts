import { it, expect, vi, afterEach } from 'vitest';
import {
  acceptedProgressiveManifest,
  beginProgressivePlayback,
} from '../src/progressive-playback';
import { progressiveFixture } from './progressive-fixture';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import {
  encodeExternalShare,
  externalReplayEngine,
} from '../src/external-share';
import { sourceId } from '../src/external-catalog';
import type { RuntimeReplay } from '../src/replay';
afterEach(() => vi.unstubAllGlobals());
it('legacy record performs no additional request', async () => {
  const f = await progressiveFixture();
  delete f.record.manifestSha256;
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  expect(
    await acceptedProgressiveManifest(f.record, new AbortController().signal),
  ).toBe(null);
  expect(fetch).not.toHaveBeenCalled();
});
it('accepted real-shaped record anchor binds manifest before any audio request', async () => {
  const f = await progressiveFixture(),
    calls: string[] = [];
  vi.stubGlobal('fetch', async (input: any) => {
    calls.push(String(input));
    return String(input).endsWith('/progressive-manifest')
      ? Response.json(f.manifestBody)
      : new Response(f.recordBody, { headers: f.recordHeaders });
  });
  expect(
    (await acceptedProgressiveManifest(f.record, new AbortController().signal))
      ?.manifest,
  ).toEqual(f.manifest);
  expect(calls).toHaveLength(2);
  const replay: RuntimeReplay = {
    version: 1,
    song: sourceId(f.record),
    lanes: 5,
    difficulty: 'low',
    options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 1 },
    ops: [[1, 9000, 9999]],
    end: 9100,
    audioLeadIn: 0.15,
  };
  const engine = externalReplayEngine(replay, f.record);
  engine.update(9999);
  const result = {
    song: replay.song,
    lanes: 5 as const,
    difficulty: 'low' as const,
    score: engine.score,
    accuracy: Math.round((engine.sum / engine.total) * 100) / 100,
    combo: engine.maxCombo,
    judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
      (v) => engine.events.filter((e) => e.value === v).length,
    ),
  };
  const fragment = await encodeExternalShare({
    record: f.record,
    replay,
    result,
    title: 'Verified stream fixture',
  });
  if (process.env.ORVIO_EXPORT_FIXTURE)
    writeFileSync(
      'tests/fixtures/progressive-browser.json',
      JSON.stringify({
        ...f,
        fragment,
        buffer: undefined,
        audioGzip64: gzipSync(Buffer.from(f.buffer)).toString('base64'),
      }),
    );
});
it('self-asserted source anchor is rejected by actual canonical record before manifest/audio fetch', async () => {
  const f = await progressiveFixture(),
    fake = { ...f.record, manifestSha256: '0'.repeat(64) };
  const fetch = vi.fn(
    async () => new Response(f.recordBody, { headers: f.recordHeaders }),
  );
  vi.stubGlobal('fetch', fetch);
  await expect(
    acceptedProgressiveManifest(fake, new AbortController().signal),
  ).rejects.toMatchObject({ code: 'integrity_failed' });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('pair-swapped manifest is rejected before any audio request', async () => {
  const f = await progressiveFixture(),
    calls: string[] = [];
  vi.stubGlobal('fetch', async (input: any) => {
    calls.push(String(input));
    return String(input).endsWith('/progressive-manifest')
      ? Response.json({
          ...f.manifestBody,
          manifest: {
            ...f.manifest,
            parts: f.manifest.parts.map((p: any) => ({
              ...p,
              sha256: '0'.repeat(64),
            })),
          },
        })
      : new Response(f.recordBody, { headers: f.recordHeaders });
  });
  await expect(
    acceptedProgressiveManifest(f.record, new AbortController().signal),
  ).rejects.toMatchObject({ code: 'integrity_failed' });
  expect(calls).toHaveLength(2);
});
