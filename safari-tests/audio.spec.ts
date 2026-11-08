import { test, expect } from '@playwright/test';
test('WebKit real preview/replay graph and gesture activation before artwork', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__probe = { contexts: [], calls: [], analysers: [], session: [] };
    if (!('audioSession' in navigator))
      Object.defineProperty(navigator, 'audioSession', {
        configurable: true,
        value: {
          set type(v) {
            w.__probe.session.push(v);
          },
        },
      });
    const Native = AudioContext;
    w.AudioContext = new Proxy(Native, {
      construct(T, args) {
        const c = Reflect.construct(T, args),
          resume = c.resume.bind(c);
        c.resume = () => {
          w.__probe.calls.push({
            kind: 'resume',
            at: performance.now(),
            gesture: navigator.userActivation?.isActive,
          });
          return resume();
        };
        w.__probe.contexts.push(c);
        return c;
      },
    });
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (...args: any[]) {
      if (args[0] instanceof AudioDestinationNode) {
        const a = this.context.createAnalyser();
        connect.call(this, a);
        w.__probe.analysers.push(a);
      }
      return connect.apply(this, args as any);
    };
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      w.__probe.calls.push({ kind: 'decode', at: performance.now() });
      await new Promise((r) => setTimeout(r, 700));
      return decode.call(this);
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/select/');
  const artTop = await page
    .locator('#selected-art')
    .evaluate((e) => e.getBoundingClientRect().top);
  await page.evaluate(async () => {
    const { SONGS } = await import(/* @vite-ignore */ String('/src/chart.ts'));
    SONGS[1].title =
      'A very long selected track title that wraps onto several lines without moving artwork';
  });
  await page
    .locator('[data-song="1"]')
    .evaluate((e) => (e as HTMLElement).click());
  expect(
    await page
      .locator('#selected-art')
      .evaluate((e) => e.getBoundingClientRect().top),
  ).toBe(artTop);
  expect(await page.locator('#selection-number').count()).toBe(0);
  const heading = await page.locator('.library .section-title').boundingBox();
  const button = await page.locator('#add-youtube').boundingBox();
  expect(button!.y).toBeGreaterThanOrEqual(heading!.y);
  expect(button!.y + button!.height).toBeLessThanOrEqual(
    heading!.y + heading!.height + 1,
  );
  await page.screenshot({ path: testInfo.outputPath('selection-stable.png') });
  await page.click('#add-youtube');
  expect(await page.locator('#youtube-rights').innerText()).toContain('5');
  await page.screenshot({ path: testInfo.outputPath('import-dialog.png') });
  await page.click('#youtube-cancel');
  const fragment = await page.evaluate(async () => {
    const { replayEngine } = await import(
      /* @vite-ignore */ String('/src/replay.ts')
    );
    const { builtinShareFragment } = await import(
      /* @vite-ignore */ String('/src/builtin-share-fragment.ts')
    );
    const replay: any = {
      version: 1,
      song: 'first-light',
      lanes: 5,
      difficulty: 'low',
      options: { speed: 4.5, fader: 'off', shuffle: 'off', seed: 1 },
      ops: [
        ...Array.from({ length: 360 }, (_, i) => [1, i * 100, i / 10]),
        [1, 36000, 9999],
      ],
      end: 36000,
    };
    const e = replayEngine(replay);
    e.update(9999);
    return builtinShareFragment(replay, {
      song: 'first-light',
      lanes: 5,
      difficulty: 'low',
      options: replay.options,
      score: e.score,
      accuracy: e.sum / e.total,
      combo: e.maxCombo,
      judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
        (v) => e.events.filter((x: { value: number }) => x.value === v).length,
      ),
    });
  });
  await page.goto('/result/#' + fragment);
  await page.locator('#results').waitFor({ state: 'visible' });
  const resultArt = await page.locator('#result-art').boundingBox();
  const resultTitle = await page.locator('#result-song').boundingBox();
  expect(resultArt!.width).toBeGreaterThan(200);
  expect(resultTitle!.y).toBeGreaterThanOrEqual(
    resultArt!.y + resultArt!.height,
  );
  await page.click('#result-preview');
  await page.waitForFunction(() => {
    const p = (window as any).__probe;
    return (
      (window as any).orvioDiagnostics.previewActive &&
      p.analysers.some((a: AnalyserNode) => {
        const d = new Float32Array(a.fftSize);
        a.getFloatTimeDomainData(d);
        return Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length) > 0.001;
      })
    );
  });
  const preview = await page.evaluate(() => ({
    session: (window as any).__probe.session,
    sessionType: (navigator as any).audioSession?.type,
    contexts: (window as any).__probe.contexts.map(
      (c: AudioContext) => c.state,
    ),
    diagnostics: (window as any).orvioDiagnostics,
  }));
  expect(
    preview.session.includes('playback') || preview.sessionType === 'playback',
  ).toBe(true);
  expect(preview.contexts).toEqual(['running']);
  await page.screenshot({ path: testInfo.outputPath('webkit-preview.png') });
  await page.click('#result-preview');
  await page.evaluate(() => {
    (window as any).__probe.calls = [];
  });
  await page.locator('#watch-replay').scrollIntoViewIfNeeded();
  await page.click('#watch-replay');
  await page.waitForFunction(() =>
    Boolean(
      (window as any).orvioDiagnostics.active &&
      (window as any).orvioDiagnostics.replayActive,
    ),
  );
  const calls = await page.evaluate(() => (window as any).__probe.calls);
  expect(calls.findIndex((x: any) => x.kind === 'resume')).toBeLessThan(
    calls.findIndex((x: any) => x.kind === 'decode'),
  );
  await page.waitForFunction(() => {
    const p = (window as any).__probe;
    return p.analysers.some((a: AnalyserNode) => {
      const d = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(d);
      return Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length) > 0.001;
    });
  });
  try {
    await page.waitForFunction(
      () => (window as any).orvioAudioTime > 3,
      undefined,
      { timeout: 12000 },
    );
  } catch (e) {
    console.log(
      'CLOCK_FAILURE',
      JSON.stringify(
        await page.evaluate(() => ({
          diagnostics: (window as any).orvioDiagnostics,
          contexts: (window as any).__probe.contexts.map((c: AudioContext) => ({
            current: c.currentTime,
            state: c.state,
            timestamp: c.getOutputTimestamp?.(),
          })),
          now: performance.now(),
        })),
      ),
    );
    throw e;
  }
  await expect(page.locator('#game')).toBeVisible();
  const bounds = await page.locator('#game').boundingBox();
  expect(bounds!.y).toBe(0);
  expect(bounds!.height).toBe(844);
  await page.screenshot({ path: testInfo.outputPath('webkit-replay.png') });
  expect(errors).toEqual([]);
  console.log(
    'WEBKIT_GRAPH_ACTIVATION',
    JSON.stringify({
      previewStates: preview.contexts,
      playbackSession: preview.session,
      calls,
      errors,
    }),
  );
});
