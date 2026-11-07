import { test, expect } from '@playwright/test';
test('real IDB six-mode source pin survives reload and version change without overwrite', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const contract = await import('/src/external-source.ts'),
      store = await import('/src/external-source-store.ts');
    const notes = [{ id: 0, time: 1, lane: 0 }],
      sha = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify(notes)),
          ),
        ),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
    const record = {
      version: 1,
      videoId: 'uXn-zOt68V8',
      audioSha256: 'a'.repeat(64),
      estimatedBpm: 144,
      sampleRate: 48000,
      frames: 48000 * 125,
      pipelineVersion: 'v1',
      analyzerVersion: 'v1',
      config: '{}',
      charts: Object.fromEntries(
        ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
          k,
          { notes, sha256: sha },
        ]),
      ),
    };
    const saved = await store.pinSource(record);
    record.analyzerVersion = 'future-v2';
    const duplicate = await store.pinSource(record);
    const old = await store.readPinnedSource(
      record.videoId,
      record.audioSha256,
    );
    return {
      saved,
      duplicate,
      version: old.analyzerVersion,
      changed: contract.matchAudio(old, 'b'.repeat(64)),
    };
  });
  expect(result).toEqual({
    saved: 'saved',
    duplicate: 'already-pinned',
    version: 'v1',
    changed: 'source-changed',
  });
  await page.reload();
  const persisted = await page.evaluate(async () => {
    const store = await import('/src/external-source-store.ts');
    const records = await store.listPinnedSources('uXn-zOt68V8');
    return records[0];
  });
  expect(persisted?.analyzerVersion).toBe('v1');
  expect(Object.keys(persisted!.charts)).toHaveLength(6);
});
test('corrupt chart and denied IDB fail truthfully rather than claim a save', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const store = await import('/src/external-source-store.ts');
    const out = [];
    try {
      await store.pinSource({ version: 1 } as any);
    } catch {
      out.push('invalid-rejected');
    }
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw Error('quota unavailable');
      },
    });
    try {
      await store.readPinnedSource('uXn-zOt68V8', 'a'.repeat(64));
    } catch {
      out.push('unavailable-rejected');
    }
    return out;
  });
  expect(result).toEqual(['invalid-rejected', 'unavailable-rejected']);
});
