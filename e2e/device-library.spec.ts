import { test, expect, type Page } from '@playwright/test';
async function fixture(page: Page, canonical = false) {
  return page.evaluate(
    async ({ canonical }) => {
      const { pinSource } = await import(
        /* @vite-ignore */ String('/src/external-source-store.ts')
      );
      const { saveLocalAudio } = await import(
        /* @vite-ignore */ String('/src/external-local.ts')
      );
      const { chartSetHash } = await import(
        /* @vite-ignore */ String('/src/external-source.ts')
      );
      const { rememberCanonical } = await import(
        /* @vite-ignore */ String('/src/canonical-library.ts')
      );
      const bytes = new ArrayBuffer(192044),
        v = new DataView(bytes);
      for (const [offset, word] of [
        [0, 'RIFF'],
        [8, 'WAVE'],
        [12, 'fmt '],
        [36, 'data'],
      ] as const)
        for (let i = 0; i < 4; i++) v.setUint8(offset + i, word.charCodeAt(i));
      v.setUint32(4, bytes.byteLength - 8, true);
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 2, true);
      v.setUint32(24, 48000, true);
      v.setUint32(28, 192000, true);
      v.setUint16(32, 4, true);
      v.setUint16(34, 16, true);
      v.setUint32(40, 192000, true);
      const digest = async (input: BufferSource) =>
        Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', input)),
          (x) => x.toString(16).padStart(2, '0'),
        ).join('');
      const notes = [{ id: 0, lane: 0, time: 0.5 }];
      const chart = {
        notes,
        sha256: await digest(new TextEncoder().encode(JSON.stringify(notes))),
      };
      const record = {
        version: 1,
        videoId: '1-xGerv5FOk',
        audioSha256: await digest(bytes),
        frames: 48000,
        sampleRate: 48000,
        estimatedBpm: 120,
        pipelineVersion: 'fixture',
        analyzerVersion: 'fixture',
        config: '{}',
        charts: Object.fromEntries(
          ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
            k,
            chart,
          ]),
        ),
      } as any;
      record.chartSetSha256 = await chartSetHash(record);
      await pinSource(record);
      await saveLocalAudio(record, 'Alan Walker - Alone', 'expired-job', bytes);
      if (canonical) await rememberCanonical(record, 'b'.repeat(64));
      return {
        audioKey:
          'yt-' + record.videoId + '-' + record.audioSha256.slice(0, 16),
      };
    },
    { canonical },
  );
}
async function blank(page: Page) {
  await page.route('**/device-fixture', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<html><body>fixture</body></html>',
    }),
  );
  await page.goto('/device-fixture');
  await page.evaluate(async () => {
    await import(/* @vite-ignore */ String('/src/device-audio-inspection.ts'));
  });
}
async function inspect(page: Page) {
  return page.evaluate(async () =>
    (
      await import(/* @vite-ignore */ String('/src/device-audio-inspection.ts'))
    ).inspectDeviceAudio('1-xGerv5FOk'),
  );
}
test('existing DB only: absent DBs remain absent, no network or storage writes', async ({
  page,
}) => {
  await blank(page);
  const before = await page.evaluate(() => indexedDB.databases());
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  expect(await inspect(page)).toBe('missing');
  expect(await page.evaluate(() => indexedDB.databases())).toEqual(before);
  expect(requests).toEqual([]);
});
test('distinguishes valid legacy audio, verified canonical, missing, invalid, blocked storage without mutation', async ({
  page,
}) => {
  await blank(page);
  const { audioKey } = await fixture(page);
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  const noWrites = await page.evaluate(async () => {
    const original = IDBDatabase.prototype.transaction;
    const modes: string[] = [];
    IDBDatabase.prototype.transaction = function (
      this: IDBDatabase,
      stores: any,
      mode?: IDBTransactionMode,
    ) {
      modes.push(mode ?? 'readonly');
      return original.call(this, stores, mode);
    } as typeof original;
    const before = localStorage.getItem('orvio.canonical-library.v1');
    try {
      const module = await import(
        /* @vite-ignore */ String('/src/device-audio-inspection.ts')
      );
      return {
        state: await module.inspectDeviceAudio('1-xGerv5FOk'),
        modes,
        unchanged:
          before === localStorage.getItem('orvio.canonical-library.v1'),
      };
    } finally {
      IDBDatabase.prototype.transaction = original;
    }
  });
  expect(noWrites.state).toBe('legacy_audio');
  expect(noWrites.modes.every((mode) => mode === 'readonly')).toBe(true);
  expect(noWrites.unchanged).toBe(true);
  await fixture(page, true);
  requests.length = 0;
  expect(await inspect(page)).toBe('ready');
  expect(requests).toEqual([]);
  await page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('orvio.external-library.v1');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('audio', 'readwrite');
      const st = tx.objectStore('audio');
      const r = st.get(key);
      r.onsuccess = () => {
        const a = r.result;
        new Uint8Array(a.bytes)[50] = 1;
        st.put(a);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, audioKey);
  expect(await inspect(page)).toBe('invalid');
  await page.evaluate(() => {
    Object.defineProperty(indexedDB, 'open', {
      configurable: true,
      value: () => {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  expect(await inspect(page)).toBe('unavailable');
});
test('expired pending row diagnostic and confirmed list removal preserve bytes/charts; cancel and reload work', async ({
  page,
}) => {
  await blank(page);
  await fixture(page);
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
    r.fulfill({
      status: r.request().url().includes('chart-sources') ? 404 : 410,
      contentType: 'application/json',
      body: r.request().url().includes('chart-sources')
        ? '{"error":"chart_source_not_found"}'
        : '{"error":{"code":"audio_expired"}}',
    }),
  );
  await page.goto('/select/');
  const row = page.locator('[data-canonical-video="1-xGerv5FOk"]');
  await expect(row).toHaveAttribute('data-state', 'error');
  await expect(
    row.getByRole('button', { name: '목록에서 삭제', exact: true }),
  ).toBeVisible();
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await row.getByRole('button', { name: '기기 저장 상태 확인' }).click();
  await expect(
    page.locator('.device-audio-dialog [data-device-audio]'),
  ).toHaveAttribute('data-device-audio', 'legacy_audio');
  expect(requests).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath('device-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath('device-mobile.png'),
    fullPage: true,
  });
  await page.locator('.device-audio-dialog button').click();
  await row.getByRole('button', { name: '목록에서 삭제', exact: true }).click();
  await expect(page.locator('#remove-song-name')).toHaveText(
    'Alan Walker - Alone',
  );
  await page.click('#remove-song-cancel');
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: '목록에서 삭제', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restoreStorageWrite = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'orvio.library-hidden.v1')
        throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.click('#remove-song-confirm');
  await expect(row).toBeVisible();
  await expect(page.locator('#remove-song-dialog')).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('orvio.library-hidden.v1')),
  ).toBeNull();
  await page.evaluate(() => (window as any).restoreStorageWrite());
  await page.click('#remove-song-cancel');
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath('remove-mobile.png'),
    fullPage: true,
  });
  await row.getByRole('button', { name: '목록에서 삭제', exact: true }).click();
  await page.click('#remove-song-confirm');
  await expect(row).toHaveCount(0);
  expect(await inspect(page)).toBe('legacy_audio');
  await page.reload();
  await expect(row).toHaveCount(0);
  expect(await inspect(page)).toBe('legacy_audio');
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('orvio.library-hidden.v1')!),
    ),
  ).toEqual(['yt:1-xGerv5FOk']);
});
