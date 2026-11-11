import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LANGUAGES, translate, type Language } from '../src/i18n';

const STATES = ['before', 'playing', 'stopped'] as const;

async function instrumentPreviewNodes(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__previewSources = [];
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this) as any;
      w.__previewSources.push(source);
      return source;
    };
  });
}

async function blockForeign(
  context: import('@playwright/test').BrowserContext,
) {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4184') return route.continue();
    await route.abort('blockedbyclient');
  });
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error('missing ' + selector);
      const rect = element.getBoundingClientRect();
      const round = (value: number) => Math.round(value * 100) / 100;
      return {
        x: round(rect.x + scrollX),
        y: round(rect.y + scrollY),
        width: round(rect.width),
        height: round(rect.height),
      };
    };
    return {
      lobby: box('#lobby'),
      intro: box('#lobby .intro'),
      art: box('#selected-art'),
      title: box('#selected-title'),
      subtitle: box('#selected-subtitle'),
      status: box('#lobby .preview-status'),
    };
  });
}

async function previewState(page: Page) {
  return page.evaluate(() => {
    const wrapper = document.querySelector<HTMLElement>(
      '#lobby .preview-status',
    )!;
    const text = document.querySelector<HTMLElement>('#preview-status')!;
    const style = getComputedStyle(wrapper);
    return {
      bodyPreviewing: document.body.classList.contains('previewing'),
      text: text.textContent,
      visibility: style.visibility,
      height: Math.round(wrapper.getBoundingClientRect().height * 100) / 100,
    };
  });
}

async function startPreview(page: Page) {
  await page.locator('.song-card.selected').click();
  await expect(page.locator('body')).toHaveClass(/previewing/);
  await page.waitForFunction(
    () => (window as any).orvioDiagnostics?.previewActive === true,
  );
}

async function stopPreview(page: Page) {
  await page.evaluate(() => {
    const sources = (window as any).__previewSources;
    sources.at(-1)?.onended?.(new Event('ended'));
  });
  await expect(page.locator('body')).not.toHaveClass(/previewing/);
}

async function setLanguage(page: Page, language: Language) {
  await page.evaluate((value) => {
    const select = document.querySelector<HTMLSelectElement>('#language')!;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, language);
  await page.waitForFunction(
    (value) => document.documentElement.lang === value,
    language,
  );
}

async function openLibrary(
  page: Page,
  options: { language?: Language; width?: number; height?: number } = {},
) {
  if (options.width && options.height)
    await page.setViewportSize({
      width: options.width,
      height: options.height,
    });
  if (options.language)
    await page.addInitScript((language) => {
      localStorage.setItem(
        'orvio.settings.v1',
        JSON.stringify({ languageMode: 'manual', language }),
      );
    }, options.language);
  await instrumentPreviewNodes(page);
  await page.goto('/select/');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !!(window as any).orvioDiagnostics);
  await expect(page.locator('.song-card.selected')).toBeVisible();
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `/downloads/orv84-${name}.png` });
}

async function assertStablePreviewGeometry(
  page: Page,
  expectedLabel: string,
  name: string,
) {
  const before = await geometry(page);
  const beforeState = await previewState(page);
  expect(beforeState).toMatchObject({
    bodyPreviewing: false,
    text: expectedLabel,
    visibility: 'hidden',
  });
  await screenshot(page, `${name}-before`);

  await startPreview(page);
  await expect(page.locator('#preview-status')).toHaveText(expectedLabel);
  const playing = await geometry(page);
  const playingState = await previewState(page);
  expect(playingState).toMatchObject({
    bodyPreviewing: true,
    text: expectedLabel,
    visibility: 'visible',
  });
  await screenshot(page, `${name}-playing`);

  await stopPreview(page);
  await expect(page.locator('#preview-status')).toHaveText(expectedLabel);
  const stopped = await geometry(page);
  const stoppedState = await previewState(page);
  expect(stoppedState).toMatchObject({
    bodyPreviewing: false,
    text: expectedLabel,
    visibility: 'hidden',
  });
  await screenshot(page, `${name}-stopped`);

  expect(playing, 'playing must not move the preview block').toEqual(before);
  expect(stopped, 'stopped must not move the preview block').toEqual(before);
  expect(playingState.height).toBe(beforeState.height);
  expect(stoppedState.height).toBe(beforeState.height);
  expect(Object.keys(STATES)).toHaveLength(3);
}

test('preview status reserves its localized line without moving the upper layout', async ({
  page,
  context,
  baseURL,
}, info) => {
  await blockForeign(context);
  const language = (
    info.project.use.locale === 'ko-KR' ? 'ko' : 'en'
  ) as Language;
  await openLibrary(page, { language });
  await assertStablePreviewGeometry(
    page,
    translate(language, 'nowPlaying'),
    info.project.name,
  );
});

test('preview status stays stable at 320px and across all 13 locales', async ({
  page,
  context,
  baseURL,
}, info) => {
  test.setTimeout(120000);
  await blockForeign(context);
  await openLibrary(page, { language: 'en', width: 320, height: 568 });
  for (const language of Object.keys(LANGUAGES) as Language[]) {
    await setLanguage(page, language);
    const label = translate(language, 'nowPlaying');
    await expect(page.locator('#preview-status')).toHaveText(label);
    await assertStablePreviewGeometry(
      page,
      label,
      `${info.project.name}-320-${language}`,
    );
  }
});

test('cached first paint reserves the status line but never shows stale playback', async ({
  page,
  context,
}, info) => {
  test.setTimeout(60000);
  await blockForeign(context);
  const seed = await context.newPage();
  await seed.goto('/select/');
  await seed.evaluate(() => document.fonts.ready);
  await seed.waitForFunction(
    () => !!localStorage.getItem('orvio.library-display.v1'),
  );
  const projection = await seed.evaluate(() =>
    JSON.parse(localStorage.getItem('orvio.library-display.v1')!),
  );
  await seed.close();

  const statusText = (tree: any): string => {
    if (typeof tree === 'string') return tree;
    if (!tree || typeof tree !== 'object') return '';
    if (tree.id === 'preview-status')
      return (tree.children || []).map(statusText).join('');
    return (tree.children || []).map(statusText).join('');
  };
  const setStatusText = (tree: any, value: string) => {
    if (!tree || typeof tree !== 'object') return;
    if (tree.id === 'preview-status') tree.children = [value];
    else
      (tree.children || []).forEach((child: any) =>
        setStatusText(child, value),
      );
  };

  await context.route('**/src/layouts/Game.astro*', (route) =>
    route.abort('blockedbyclient'),
  );

  const full = structuredClone(projection);
  const expected = statusText(full.fragments['.preview-status']);
  expect(expected).not.toBe('');
  await page.addInitScript((cache) => {
    localStorage.setItem('orvio.library-display.v1', JSON.stringify(cache));
  }, full);
  await page.goto('/select/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: readFileSync('src/style.css', 'utf8') });
  const cached = page.locator('#cached-lobby .preview-status');
  await expect(page.locator('#library-first-paint')).toBeVisible();
  await expect(cached).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('#cached-preview-status')).toHaveText(expected);
  const fullHeight = await cached.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(fullHeight).toBeGreaterThanOrEqual(20.5);
  expect(fullHeight).toBeLessThanOrEqual(21.5);

  const old = structuredClone(projection);
  setStatusText(old.fragments['.preview-status'], '');
  const oldPage = await context.newPage();
  await oldPage.addInitScript((cache) => {
    localStorage.setItem('orvio.library-display.v1', JSON.stringify(cache));
  }, old);
  await oldPage.goto('/select/', { waitUntil: 'domcontentloaded' });
  await oldPage.addStyleTag({ content: readFileSync('src/style.css', 'utf8') });
  const oldCached = oldPage.locator('#cached-lobby .preview-status');
  await expect(oldPage.locator('#library-first-paint')).toBeVisible();
  await expect(oldCached).toHaveCSS('visibility', 'hidden');
  await expect(oldPage.locator('#cached-preview-status')).toHaveText('');
  const oldHeight = await oldCached.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(oldHeight).toBeGreaterThanOrEqual(20.5);
  expect(oldHeight).toBeLessThanOrEqual(21.5);
  expect(oldHeight).toBe(fullHeight);
  await oldPage.screenshot({
    path: `/downloads/orv84-${info.project.name}-cached-fallback.png`,
  });
});
