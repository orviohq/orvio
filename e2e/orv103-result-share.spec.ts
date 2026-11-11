import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { builtinShareFragment } from '../src/builtin-share-fragment';
import { replayEngine, decodeReplay, replayMatches, type RuntimeReplay } from '../src/replay';
import { readResult, type SharedResult } from '../src/share';

// Generic synthetic fixture; granted headless clipboard is not real-device proof.
const replay: RuntimeReplay = {
  version: 1, song: 'first-light', lanes: 5, difficulty: 'low',
  options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 1 },
  ops: [], end: 100,
};
const engine = replayEngine(replay);
engine.update(9999);
const result: SharedResult = {
  song: 'first-light', lanes: replay.lanes, difficulty: replay.difficulty,
  score: engine.score, accuracy: engine.sum / engine.total, combo: engine.maxCombo,
  options: replay.options,
  judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
    value => engine.events.filter(event => event.value === value).length,
  ),
};

function observeWrites(context: BrowserContext) {
  const writes: string[] = [];
  context.on('request', request => {
    if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());
  });
  return writes;
}

async function openResult(page: Page) {
  await page.goto('/result/#' + await builtinShareFragment(replay, result));
  await expect(page.locator('#share-result')).toBeVisible();
  await expect(page.locator('#watch-replay')).toBeVisible();
}

async function waitForSettledResult(page: Page) {
  await expect(page.locator('#results')).not.toHaveAttribute('data-result-animating', 'true');
  for (const selector of ['#result-score', '#result-rate', '#judgment-list']) {
    await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator(selector)).toContainText(/\d/);
  }
}

test('granted headless clipboard preserves complete result and replay in a fresh context', async ({ page, context, browser }, info) => {
  const writes = observeWrites(context);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openResult(page);
  const stableSelectors = ['#result-song', '#result-score', '#result-rate', '#result-combo', '#result-break', '#judgment-list', '#result-options'];
  const originalFields = await Promise.all(stableSelectors.map(selector => page.locator(selector).textContent()));
  await page.locator('#share-result').click();
  await expect(page.locator('#share-result')).toBeEnabled();
  // Success uses Sonner; #share-status is the generation/clipboard error surface.
  await expect(page.locator('[data-sonner-toast]')).toContainText('링크를 복사했어요');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/^http:\/\/127\.0\.0\.1:4313\/result\/#/);
  const params = new URLSearchParams(new URL(copied).hash.slice(1));
  expect(readResult(params)).toEqual(result);
  expect(params.get('rp')).toBe('1');
  expect(params.get('rn')).toBe(String(params.get('r')!.length));
  const decoded = await decodeReplay(params.get('r')!);
  expect(decoded).not.toBeNull();
  expect(replayMatches(decoded!, result)).toBe(true);
  expect(decoded!.options).toEqual(replay.options);
  expect(writes).toEqual([]);
  mkdirSync('qa-evidence/orv103', { recursive: true });
  await waitForSettledResult(page);
  await page.screenshot({ path: `qa-evidence/orv103/${info.project.name}-copied.png`, fullPage: true });
  const fresh = await browser.newContext({ serviceWorkers: 'block', locale: 'ko-KR', viewport: page.viewportSize()! });
  try {
    const freshWrites = observeWrites(fresh);
    const restored = await fresh.newPage();
    await restored.goto(copied);
    await expect(restored.locator('#watch-replay')).toBeVisible();
    for (const [index, selector] of stableSelectors.entries())
      await expect(restored.locator(selector)).toHaveText(originalFields[index] ?? '');
    expect(freshWrites).toEqual([]);
    await waitForSettledResult(restored);
    await restored.screenshot({ path: `qa-evidence/orv103/${info.project.name}-restored.png`, fullPage: true });
  } finally { await fresh.close(); }
});

for (const mode of ['denied', 'unsupported'] as const) {
  test(`synthetic ${mode} clipboard reports failure after trusted click`, async ({ page, context }, info) => {
    const writes = observeWrites(context);
    await context.addInitScript(mode => {
      const denied = () => Promise.reject(new DOMException('Synthetic permission denial', 'NotAllowedError'));
      Object.defineProperty(navigator, 'clipboard', { configurable: true,
        value: mode === 'unsupported' ? undefined : { write: denied, writeText: denied },
      });
    }, mode);
    await openResult(page);
    await page.locator('#share-result').click();
    await expect(page.locator('#share-status')).toContainText('공유하지 못했어요. 링크를 복사하지 않았어요. 나중에 다시 시도해주세요.');
    await expect(page.locator('#share-result')).toBeEnabled();
    expect(writes).toEqual([]);
    mkdirSync('qa-evidence/orv103', { recursive: true });
    await waitForSettledResult(page);
    await page.screenshot({ path: `qa-evidence/orv103/${info.project.name}-${mode}.png`, fullPage: true });
  });
}
