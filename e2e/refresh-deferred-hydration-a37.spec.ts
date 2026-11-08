import { test, expect } from '@playwright/test';
// A37 repro: a deferred external /play/yt- route must not paint the home
// screen's start button while the library hydrates.
async function seedExternalFixture(page: any): Promise<string> {
  await page.goto('/select/');
  return await page.evaluate(async () => {
    const { saveLocalAudio } = await import(
      /* @vite-ignore */ String('/src/external-local.ts')
    );
    const { pinSource } = await import(
      /* @vite-ignore */ String('/src/external-source-store.ts')
    );
    const { chartSetHash } = await import(
      /* @vite-ignore */ String('/src/external-source.ts')
    );
    const { FAMILY_CHART_KEYS, difficultyForChart } = await import(
      /* @vite-ignore */ String('/src/chart-difficulty.ts')
    );
    const { sourceId } = await import(
      /* @vite-ignore */ String('/src/external-catalog.ts')
    );
    const wav = new ArrayBuffer(192044);
    const v = new DataView(wav);
    for (const [offset, word] of [
      [0, 'RIFF'],
      [8, 'WAVE'],
      [12, 'fmt '],
      [36, 'data'],
    ] as const)
      for (let i = 0; i < 4; i++) v.setUint8(offset + i, word.charCodeAt(i));
    v.setUint32(4, wav.byteLength - 8, true);
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 2, true);
    v.setUint32(24, 48000, true);
    v.setUint32(28, 192000, true);
    v.setUint16(32, 4, true);
    v.setUint16(34, 16, true);
    v.setUint32(40, 192000, true);
    const hash = async (b: BufferSource) =>
      Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', b)),
        (x) => x.toString(16).padStart(2, '0'),
      ).join('');
    const notes = [{ id: 0, lane: 0, time: 0.5 }];
    const sha = await hash(wav);
    const noteHash = await hash(
      new TextEncoder().encode(JSON.stringify(notes)),
    );
    const record: any = {
      version: 1,
      videoId: 'AAAAAAAAAAA',
      audioSha256: sha,
      frames: 48000,
      sampleRate: 48000,
      estimatedBpm: 120,
      pipelineVersion: 'fixture',
      analyzerVersion: 'fixture',
      config: '{}',
      charts: Object.fromEntries(
        FAMILY_CHART_KEYS.map((k: string) => [k, { notes, sha256: noteHash }]),
      ),
      chartMetadata: Object.fromEntries(
        FAMILY_CHART_KEYS.map((k: string) => [
          k,
          difficultyForChart(notes, 1, k),
        ]),
      ),
    };
    record.chartSetSha256 = await chartSetHash(record);
    await saveLocalAudio(record, 'YT Fixture', undefined, wav);
    await pinSource(record);
    return sourceId(record);
  });
}

const sampler = () => {
  const w = window as any;
  w.__flashLog = [];
  let last = '';
  const sample = () => {
    const q = (s: string) => {
      const el = document.querySelector(s);
      return el ? !el.classList.contains('hidden') : null;
    };
    const state = JSON.stringify({
      home: q('#home-screen'),
      ready: q('#ready-screen'),
      loading: q('#song-loading'),
      select: q('#lobby'),
    });
    if (state !== last) {
      last = state;
      w.__flashLog.push({ t: Math.round(performance.now()), state });
    }
    if (performance.now() < 60000) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
};

// A hard refresh of an external /play/yt- URL 404s before the app boots
// (static build, builtin-only getStaticPaths, no SPA fallback), so the
// reachable deferred route is the select link carrying the external song.
test('deferred external select route never paints home while hydrating', async ({
  page,
}) => {
  const id = await seedExternalFixture(page);
  await page.addInitScript(sampler);
  await page.goto(`/select/?song=${id}`);
  await expect(page.locator('#lobby')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#songs .song-card').first()).toBeVisible();
  const frames: { t: number; state: string }[] = await page.evaluate(
    () => (window as any).__flashLog,
  );
  console.log('YT SELECT FRAMES', JSON.stringify(frames));
  const states = frames.map((f) => JSON.parse(f.state));
  expect(states.some((s) => s.home === true)).toBe(false);
  expect(states.some((s) => s.ready === true)).toBe(false);
  // The hydrated library owns the route: the external song is the selection.
  await expect(page).toHaveURL(new RegExp(`song=${id}`));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active, {
    timeout: 30000,
  });
});
