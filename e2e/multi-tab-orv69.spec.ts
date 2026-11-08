import { test, expect } from '@playwright/test';
test('two actual tabs reject a conflicting generated identity and keep the selected immutable pin readable', async ({
  context,
}) => {
  await context.route('**/tabs-fixture', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<html><body>fixture</body></html>',
    }),
  );
  const a = await context.newPage(),
    b = await context.newPage();
  await Promise.all([a.goto('/tabs-fixture'), b.goto('/tabs-fixture')]);
  const records = await a.evaluate(async () => {
    const { chartSetHash } = await import(
      /* @vite-ignore */ String('/src/external-source.ts')
    );
    const { FAMILY_CHART_KEYS, difficultyForChart } = await import(
      /* @vite-ignore */ String('/src/chart-difficulty.ts')
    );
    const wav = new ArrayBuffer(192044),
      v = new DataView(wav);
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
    const notes = [{ id: 0, lane: 0, time: 0.5 }],
      sha = await hash(wav),
      noteHash = await hash(new TextEncoder().encode(JSON.stringify(notes)));

    const list = [];
    for (let i = 0; i < 20; i++) {
      const pair = [];
      for (let variant = 0; variant < 2; variant++) {
        const videoId = 'TABRACE' + String(i).padStart(4, '0');
        const notes = [{ id: 0, lane: variant, time: 0.5 }],
          noteHash = await hash(
            new TextEncoder().encode(JSON.stringify(notes)),
          );
        const record: any = {
          version: 1,
          videoId,
          audioSha256: sha,
          frames: 48000,
          sampleRate: 48000,
          estimatedBpm: 120,
          pipelineVersion: 'fixture',
          analyzerVersion: 'fixture',
          config: '{}',
          charts: Object.fromEntries(
            FAMILY_CHART_KEYS.map((k: string) => [
              k,
              { notes, sha256: noteHash },
            ]),
          ),
          chartMetadata: Object.fromEntries(
            FAMILY_CHART_KEYS.map((k: string) => [
              k,
              difficultyForChart(notes, 1, k),
            ]),
          ),
        };
        record.chartSetSha256 = await chartSetHash(record);
        const raw = JSON.stringify(record),
          rawHash = await hash(new TextEncoder().encode(raw));

        record.sourceProvenance = 'local-current35-v1';
        pair.push(record);
      }
      list.push(pair);
    }
    return list;
  });
  const publish = async (page: any, record: any) =>
    page.evaluate(async (record: any) => {
      const { rememberLocalGenerated, recordDigest } = await import(
        /* @vite-ignore */ String('/src/local-generated-library.ts')
      );
      try {
        await rememberLocalGenerated(record, await recordDigest(record));
        return 'saved';
      } catch (e) {
        return String(e);
      }
    }, record);
  for (const pair of records) {
    const out = await Promise.all([publish(a, pair[0]), publish(b, pair[1])]);
    expect(out.filter((x) => x === 'saved')).toHaveLength(1);
    expect(out.some((x) => x.includes('identity changed'))).toBe(true);
    const state = await a.evaluate(async (videoId: string) => {
      const { savedLocalGenerated, recordDigest } = await import(
        /* @vite-ignore */ String('/src/local-generated-library.ts')
      );
      const saved = await savedLocalGenerated(videoId);
      const ref = JSON.parse(
        localStorage.getItem('orvio.local-generated-library.v1') || '[]',
      ).find((r: any) => r.videoId === videoId);
      return { digest: await recordDigest(saved), ref };
    }, pair[0].videoId);
    expect(state.digest).toBe(state.ref.recordSha256);
  }
  const interrupted = await a.evaluate(async (pair: any[]) => {
    const { rememberLocalGenerated, recordDigest } = await import(
      /* @vite-ignore */ String('/src/local-generated-library.ts')
    );
    const { listPinnedSources } = await import(
      /* @vite-ignore */ String('/src/external-source-store.ts')
    );
    const one = { ...pair[0], videoId: 'SPLITPIN001' },
      two = { ...pair[1], videoId: 'SPLITPIN001' };
    const original = Storage.prototype.setItem;
    let firstRejected = false;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === 'orvio.local-generated-library.v1')
        throw Error('storage-full-fixture');
      return original.call(this, k, v);
    };
    try {
      await rememberLocalGenerated(one, await recordDigest(one));
    } catch {
      firstRejected = true;
    } finally {
      Storage.prototype.setItem = original;
    }
    let secondSaved = false;
    try {
      await rememberLocalGenerated(two, await recordDigest(two));
      secondSaved = true;
    } catch {}
    return {
      firstRejected,
      secondSaved,
      pins: (await listPinnedSources('SPLITPIN001')).length,
    };
  }, records[0]);
  console.log('SPLIT_PUBLICATION', JSON.stringify(interrupted));
  expect(interrupted.firstRejected).toBe(true);
  expect(interrupted.secondSaved).toBe(false);
  expect(interrupted.pins).toBe(1);
  await b.reload();
  const recovered = await b.evaluate(async (pair: any[]) => {
    const { rememberLocalGenerated, savedLocalGenerated, recordDigest } =
      await import(
        /* @vite-ignore */ String('/src/local-generated-library.ts')
      );
    const { listPinnedSources, pinSource } = await import(
      /* @vite-ignore */ String('/src/external-source-store.ts')
    );
    const one = { ...pair[0], videoId: 'SPLITPIN001' };
    const old = await savedLocalGenerated('SPLITPIN001');
    const exact = (await recordDigest(old)) === (await recordDigest(one));
    await rememberLocalGenerated(one, await recordDigest(one));
    const projection = JSON.parse(
      localStorage.getItem('orvio.local-generated-library.v1') || '[]',
    ).find((r: any) => r.videoId === 'SPLITPIN001');
    const pair2 = pair.map((r) => ({ ...r, videoId: 'OLDORPHAN01' }));
    await pinSource(pair2[0]);
    await pinSource(pair2[1]);
    let readRejected = false,
      writeRejected = false;
    try {
      await savedLocalGenerated('OLDORPHAN01');
    } catch {
      readRejected = true;
    }
    try {
      await rememberLocalGenerated(pair2[0], await recordDigest(pair2[0]));
    } catch {
      writeRejected = true;
    }
    return {
      exact,
      projectionDigest: projection.recordSha256,
      expected: await recordDigest(one),
      singlePins: (await listPinnedSources('SPLITPIN001')).length,
      readRejected,
      writeRejected,
      retainedConflictPins: (await listPinnedSources('OLDORPHAN01')).length,
    };
  }, records[0]);
  expect(recovered.exact).toBe(true);
  expect(recovered.projectionDigest).toBe(recovered.expected);
  expect(recovered.singlePins).toBe(1);
  expect(recovered.readRejected).toBe(true);
  expect(recovered.writeRejected).toBe(true);
  expect(recovered.retainedConflictPins).toBe(2);
  console.log('ORPHAN_RECOVERY', JSON.stringify(recovered));
  const identical = { ...records[0][0], videoId: 'SAMEPIN0001' };
  expect(
    await Promise.all([publish(a, identical), publish(b, identical)]),
  ).toEqual(['saved', 'saved']);
  const separate = [
    { ...records[0][0], videoId: 'DISTINCT001' },
    { ...records[0][0], videoId: 'DISTINCT002' },
  ];
  expect(
    await Promise.all([publish(a, separate[0]), publish(b, separate[1])]),
  ).toEqual(['saved', 'saved']);
  const refs = await a.evaluate(() =>
    JSON.parse(
      localStorage.getItem('orvio.local-generated-library.v1') || '[]',
    ).map((r: any) => r.videoId),
  );
  expect(refs).toEqual(expect.arrayContaining(['DISTINCT001', 'DISTINCT002']));
  await a.evaluate(async () => {
    (window as any).held = false;
    void navigator.locks.request(
      'orvio.local-generated-library.publication.v1',
      () =>
        new Promise<void>((resolve) => {
          (window as any).release = resolve;
          (window as any).held = true;
        }),
    );
  });
  await a.waitForFunction(() => (window as any).held);
  const canceled = await b.evaluate(
    async (record: any) => {
      const { rememberLocalGenerated, recordDigest } = await import(
        /* @vite-ignore */ String('/src/local-generated-library.ts')
      );
      const c = new AbortController();
      const pending = rememberLocalGenerated(
        record,
        await recordDigest(record),
        c.signal,
      );
      setTimeout(() => c.abort(), 30);
      try {
        await pending;
        return 'saved';
      } catch (e) {
        return (e as Error).name;
      }
    },
    { ...records[0][0], videoId: 'ABORTPIN001' },
  );
  expect(canceled).toBe('AbortError');
  await a.evaluate(() => (window as any).release());
  const unavailable = await b.evaluate(
    async (record: any) => {
      const { rememberLocalGenerated, recordDigest } = await import(
        /* @vite-ignore */ String('/src/local-generated-library.ts')
      );
      Object.defineProperty(navigator, 'locks', {
        value: undefined,
        configurable: true,
      });
      try {
        await rememberLocalGenerated(record, await recordDigest(record));
        return 'saved';
      } catch (e) {
        return String(e);
      } finally {
        delete (navigator as any).locks;
      }
    },
    { ...records[0][0], videoId: 'NOLOCKS0001' },
  );
  expect(unavailable).toContain('Local chart storage unavailable');
  const finalRefs = await a.evaluate(() =>
    localStorage.getItem('orvio.local-generated-library.v1'),
  );
  expect(finalRefs).not.toContain('ABORTPIN001');
  expect(finalRefs).not.toContain('NOLOCKS0001');
  console.log(
    'MULTITAB_CONFLICT_ROUNDS',
    records.length,
    'identical/different/queued-abort/no-lock passed',
  );
});
