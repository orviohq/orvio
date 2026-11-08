import { test, expect } from '@playwright/test';
test('cold frozen replay audio accepts one stable GET; validated local reload is offline and frozen chart stays exact', async ({
  page,
}) => {
  await page.route('**/a16-fixture', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<html><body>A16 isolated audio contract fixture</body></html>',
    }),
  );
  await page.goto('/a16-fixture');
  const out = await page.evaluate(async () => {
    const { readSharedAudio } = await import(
      /* @vite-ignore */ String('/src/external-share-audio.ts')
    );
    const { externalAudio, installExternalSource } = await import(
      /* @vite-ignore */ String('/src/external-catalog.ts')
    );
    const wav = new ArrayBuffer(192044),
      v = new DataView(wav);
    for (const [off, word] of [
      [0, 'RIFF'],
      [8, 'WAVE'],
      [12, 'fmt '],
      [36, 'data'],
    ] as const)
      for (let i = 0; i < 4; i++) v.setUint8(off + i, word.charCodeAt(i));
    v.setUint32(4, wav.byteLength - 8, true);
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 2, true);
    v.setUint32(24, 48000, true);
    v.setUint32(28, 192000, true);
    v.setUint16(32, 4, true);
    v.setUint16(34, 16, true);
    v.setUint32(40, 192000, true);
    v.setInt16(44, 16384, true);
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', wav))]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
    const record: any = {
      videoId: 'AAAAAAAAAAA',
      audioSha256: sha,
      frames: 48000,
      sampleRate: 48000,
      estimatedBpm: 120,
      chartSetSha256: 'a'.repeat(64),
      charts: { '5:low': { notes: [{ id: 0, time: 0.5, lane: 0 }] } },
    };
    const frozen = JSON.stringify(record);
    const item = installExternalSource(
      record,
      'Frozen test',
      undefined,
      'expired-job',
    );
    const calls: string[] = [];
    const original = fetch;
    window.fetch = async (input: any, init?: RequestInit) => {
      if (init?.method && init.method !== 'GET') throw Error('POST forbidden');
      calls.push(String(input));
      if (!String(input).endsWith('/v1/chart-sources/AAAAAAAAAAA/audio'))
        throw Error('Unexpected chart/job GET');
      return new Response(wav, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': String(wav.byteLength),
          'X-Content-SHA256': sha,
          'X-Canonical-Audio-SHA256': sha,
          'X-Source-Video-Id': record.videoId,
          'X-Audio-Contract': 'audio/1',
        },
      });
    };
    const t = performance.now();
    await readSharedAudio(item);
    const accepted = performance.now();
    const context = new AudioContext({ sampleRate: 48000 });
    const audio = externalAudio(item.song.id, context);
    const converted = performance.now();
    await context.close();
    item.bytes = undefined;
    window.fetch = async () => {
      throw Error('Offline');
    };
    await readSharedAudio(item);
    window.fetch = original;
    return {
      calls,
      unchanged: JSON.stringify(record) === frozen,
      localBytes: item.bytes?.byteLength,
      frames: audio.length,
      rate: audio.sampleRate,
      first: audio.getChannelData(0)[0],
      fixtureAcceptMs: accepted - t,
      fixtureConvertMs: converted - accepted,
    };
  });
  expect(out.calls).toHaveLength(1);
  expect(out.unchanged).toBe(true);
  expect(out.localBytes).toBe(192044);
  expect(out.frames).toBe(48000);
  expect(out.rate).toBe(48000);
  expect(out.first).toBe(0.5);
  console.log(JSON.stringify(out));
});
