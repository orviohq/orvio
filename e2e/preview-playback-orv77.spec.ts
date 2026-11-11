import { expect, test, type Page } from '@playwright/test';
import { translate } from '../src/i18n';

async function instrumentPreviewNodes(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__previewSources = [];
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this) as any;
      const start = source.start.bind(source);
      const stop = source.stop.bind(source);
      source.__startArgs = null;
      source.__stops = 0;
      source.start = (...args: any[]) => {
        source.__startArgs = args;
        return start(...args);
      };
      source.stop = (...args: any[]) => {
        source.__stops++;
        return stop(...args);
      };
      w.__previewSources.push(source);
      return source;
    };
  });
}

const previewConfig = (page: Page) =>
  page.evaluate(() => {
    const sources = (window as any).__previewSources;
    const source = sources[sources.length - 1];
    return {
      loop: source.loop,
      loopStart: source.loopStart,
      loopEnd: source.loopEnd,
      startArgs: source.__startArgs,
      duration: source.buffer?.duration,
      stops: source.__stops,
    };
  });

test('external preview plays from 8s past 24s and ends naturally at the 26s buffer end', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/select/');
  const result = await page.evaluate(async () => {
    const { guardPreviewEnd, startPreview } = await import(
      // @ts-expect-error browser-only Vite module URL
      /* @vite-ignore */ '/src/preview-playback.ts'
    );
    const context = new AudioContext();
    await context.resume();
    const seconds = 26;
    const buffer = context.createBuffer(
      1,
      context.sampleRate * seconds,
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      samples[i] =
        Math.sin((2 * Math.PI * 440 * i) / context.sampleRate) * 0.25;

    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = 0.5;
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(gain);
    gain.connect(analyser);
    analyser.connect(context.destination);

    let startArgs: number[] | undefined;
    const start = source.start.bind(source);
    source.start = (...args: number[]) => {
      startArgs = args;
      return start(...(args as [number?, number?]));
    };

    let current: typeof source | undefined = source;
    let endedAt: number | undefined;
    let clears = 0;
    guardPreviewEnd(
      source,
      () => current,
      () => {
        clears++;
        endedAt = context.currentTime;
        current = undefined;
      },
    );

    const startedAt = context.currentTime;
    startPreview(source, 'external', buffer.duration);
    const loop = source.loop;
    const loopStart = source.loopStart;
    const loopEnd = source.loopEnd;

    const waitUntil = async (condition: () => boolean) => {
      while (!condition()) await new Promise((r) => setTimeout(r, 25));
    };
    await waitUntil(() => context.currentTime - startedAt >= 16.3);
    const samplesAt243 = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samplesAt243);
    let energy = 0;
    for (const sample of samplesAt243) energy += sample * sample;
    energy = Math.sqrt(energy / samplesAt243.length);
    const activePast243 = current === source;
    await waitUntil(
      () => endedAt !== undefined || context.currentTime - startedAt > 21,
    );
    const elapsedAtEnd = endedAt === undefined ? null : endedAt - startedAt;
    await context.close();
    return {
      loop,
      loopStart,
      loopEnd,
      startArgs,
      duration: buffer.duration,
      energy,
      activePast243,
      clears,
      elapsedAtEnd,
      positionAtEnd: elapsedAtEnd === null ? null : 8 + elapsedAtEnd,
    };
  });

  expect(result.loop).toBe(false);
  expect(result.loopStart).toBe(0);
  expect(result.loopEnd).toBe(0);
  expect(result.startArgs).toEqual([0, 8]);
  expect(result.duration).toBeCloseTo(26, 3);
  expect(result.energy).toBeGreaterThan(0.01);
  expect(result.activePast243).toBe(true);
  expect(result.clears).toBe(1);
  expect(result.elapsedAtEnd).not.toBeNull();
  expect(result.elapsedAtEnd!).toBeGreaterThan(17.5);
  expect(result.elapsedAtEnd!).toBeLessThan(20.5);
  expect(result.positionAtEnd!).toBeGreaterThan(25.5);
  expect(result.positionAtEnd!).toBeLessThan(28.5);
});

test('built-in preview keeps 8-24 loop; selection switch, stale end, and game start stay owned', async ({
  page,
}) => {
  await instrumentPreviewNodes(page);
  await page.goto('/select/');
  const selected = page.locator('.song-card.selected');
  await expect(selected).toBeVisible();
  await selected.click();
  await expect(page.locator('body')).toHaveClass(/previewing/);
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.previewActive,
  );

  const builtin = await previewConfig(page);
  expect(builtin.loop).toBe(true);
  expect(builtin.loopStart).toBe(8);
  expect(builtin.loopEnd).toBe(Math.min(24, builtin.duration!));
  expect(builtin.startArgs).toEqual([0, 8]);

  const beforeSwitch = await page.evaluate(
    () => (window as any).__previewSources.length,
  );
  const oldIndex = beforeSwitch - 1;
  await page.locator('#songs [data-song]:not(.selected)').first().click();
  await page.waitForFunction(
    (count) =>
      (window as any).__previewSources.length > count &&
      (window as any).orvioDiagnostics.previewActive,
    beforeSwitch,
  );
  expect(
    await page.evaluate(
      (index) => (window as any).__previewSources[index].__stops,
      oldIndex,
    ),
  ).toBeGreaterThan(0);

  const stale = await page.evaluate((index) => {
    const old = (window as any).__previewSources[index];
    old.onended?.(new Event('ended'));
    return {
      active: (window as any).orvioDiagnostics.previewActive,
      previewing: document.body.classList.contains('previewing'),
      newerStops: (window as any).__previewSources.at(-1).__stops,
    };
  }, oldIndex);
  expect(stale.active).toBe(true);
  expect(stale.previewing).toBe(true);
  expect(stale.newerStops).toBe(0);

  await page.click('#start');
  await page.waitForFunction(
    () => !(window as any).orvioDiagnostics.previewActive,
  );
  await expect(page.locator('body')).not.toHaveClass(/previewing/);
});

test('result preview toggles and an ended callback clears its own UI on mobile', async ({
  page,
}) => {
  await instrumentPreviewNodes(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    '/result/#v=3&song=first-light&keys=5&diff=low&score=500000&acc=50.00&combo=1&j=1,0,0,0,0,0,0,0,0,0,0,1',
  );
  const toggle = page.locator('#result-preview');
  await expect(page.locator('#results')).toBeVisible();
  // The result projection can paint before module hydration; wait for the
  // app's event handlers instead of clicking the pre-hydration button.
  await page.waitForFunction(() => !!(window as any).orvioDiagnostics);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true', {
    timeout: 15000,
  });
  await expect(page.locator('body')).toHaveClass(/previewing/);
  const config = await previewConfig(page);
  expect(config.loop).toBe(true);
  expect(config.loopStart).toBe(8);
  expect(config.startArgs).toEqual([0, 8]);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).not.toHaveClass(/previewing/);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    const sources = (window as any).__previewSources;
    sources[sources.length - 1].onended?.(new Event('ended'));
  });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).not.toHaveClass(/previewing/);
  await expect(page.locator('#preview-status')).toHaveText(
    translate('ko', 'nowPlaying'),
  );
  await expect(page.locator('#app .preview-status')).toHaveCSS(
    'visibility',
    'hidden',
  );
});

test('mobile selection preview stops when the page hides', async ({ page }) => {
  await instrumentPreviewNodes(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/select/');
  const selected = page.locator('.song-card.selected');
  await expect(selected).toBeVisible();
  await selected.click();
  await expect(page.locator('body')).toHaveClass(/previewing/);
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics.previewActive,
  );

  const state = await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    const source = (window as any).__previewSources.at(-1);
    return {
      active: (window as any).orvioDiagnostics.previewActive,
      previewing: document.body.classList.contains('previewing'),
      stops: source.__stops,
    };
  });
  expect(state.active).toBe(false);
  expect(state.previewing).toBe(false);
  expect(state.stops).toBeGreaterThan(0);
});
