import { test, expect } from '@playwright/test';
test('local PCM cache is exact, versioned and nonessential to play', async ({
  page,
  baseURL,
}) => {
  test.skip(
    !baseURL?.includes('127.0.0.1'),
    'Direct module test uses the local source server',
  );
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { cachedAudio, saveAudio } = await import(
      /* @vite-ignore */ String('/src/audio-cache.ts')
    );
    const ctx = new AudioContext({ sampleRate: 44100 });
    const buffer = ctx.createBuffer(2, 4096, 44100);
    for (let c = 0; c < 2; c++)
      for (let i = 0; i < 4096; i++)
        buffer.getChannelData(c)[i] = Math.sin(i * 0.1 + c) * 0.3;
    await saveAudio('test-exact', { buffer, peak: 0.3 });
    const got = await cachedAudio('test-exact', ctx);
    const exact =
      !!got &&
      [0, 1].every((c) =>
        got.buffer
          .getChannelData(c)
          .every((v: number, i: number) => v === buffer.getChannelData(c)[i]),
      );
    const missing = await cachedAudio('not-cached', ctx);
    const old = indexedDB.open.bind(indexedDB);
    Object.defineProperty(indexedDB, 'open', {
      configurable: true,
      value: () => {
        throw new DOMException('QuotaExceeded', 'QuotaExceededError');
      },
    });
    await saveAudio('test-full', { buffer, peak: 0.3 });
    const failed = await cachedAudio('test-exact', ctx);
    Object.defineProperty(indexedDB, 'open', {
      configurable: true,
      value: old,
    });
    await ctx.close();
    return { exact, peak: got?.peak, missing: !missing, unavailable: !failed };
  });
  expect(result).toEqual({
    exact: true,
    peak: 0.3,
    missing: true,
    unavailable: true,
  });
});
