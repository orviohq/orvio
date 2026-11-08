import { test, expect } from '@playwright/test';
test('real worker abort rejects before creation or terminates after sole-buffer transfer', async ({
  page,
}) => {
  await page.route('**/abort-fixture', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<html><body>fixture</body></html>',
    }),
  );
  await page.goto('/abort-fixture');
  const results = await page.evaluate(async () => {
    const { prepareLocalChartOwned } = await import(
      /* @vite-ignore */ String('/src/local-chart-worker-client.ts')
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

    const NativeWorker = window.Worker;
    const results = [];
    for (const delay of [-1, 0, 1]) {
      const controller = new AbortController();
      let created = 0,
        terminated = 0;
      window.Worker = class extends NativeWorker {
        constructor(url: any, options?: WorkerOptions) {
          super(url, options);
          created++;
        }
        postMessage(message: any, transfer: any) {
          super.postMessage(message, transfer);
          if (delay === 0) controller.abort();
          else setTimeout(() => controller.abort(), delay);
        }
        terminate() {
          terminated++;
          super.terminate();
        }
      } as any;
      const bytes = wav.slice(0);
      if (delay === -1) controller.abort();
      let rejected = false,
        resolved = false;
      try {
        await prepareLocalChartOwned({
          bytes,
          videoId: 'ABORTWORK01',
          audioSha256: sha,
          signal: controller.signal,
        });
        resolved = true;
      } catch (e) {
        rejected = (e as Error).name === 'AbortError';
      }
      await new Promise((r) => setTimeout(r, 150));
      results.push({
        delay,
        created,
        terminated,
        bytes: bytes.byteLength,
        rejected,
        resolved,
      });
    }
    window.Worker = NativeWorker;
    return results;
  });
  for (const r of results) {
    expect(r.rejected).toBe(true);
    expect(r.resolved).toBe(false);
    expect(r.created).toBe(r.delay === -1 ? 0 : 1);
    expect(r.terminated).toBe(r.created);
    expect(r.bytes).toBe(r.delay === -1 ? 192044 : 0);
  }
  console.log('ACTUAL_WORKER_ABORT', JSON.stringify(results));
});
