import { test, expect, type Browser } from '@playwright/test';

const MOCK_ID = 'MOCKshare01';
type Case = { name: string; ko: RegExp; en: RegExp };
const cases: Case[] = [
  {
    name: 'http-descriptor',
    ko: /보관된 곡 정보를 확인하지 못했습니다/,
    en: /retained song details could not be checked/,
  },
  {
    name: 'visibility-storage',
    ko: /목록에 표시하는 정보를 저장하지 못했습니다/,
    en: /list visibility information could not be saved/,
  },
];
const views = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'short', width: 390, height: 420 },
];
const mockModule = `
import { SongShareSaveError } from '/src/song-share-save-diagnostic.ts';
const id = '${MOCK_ID}';
window.__orv85AddCalls = 0;
export function parseSongShare() {
  return { videoId: id, audioSha256: 'a'.repeat(64), chartSetSha256: 'b'.repeat(64), recordSha256: 'c'.repeat(64) };
}
export async function inspectSongLink(identity) {
  return { record: { videoId: identity.videoId }, metadata: { title: 'Mock track', author: null }, recordSha256: identity.recordSha256 };
}
export async function addSharedSong() {
  window.__orv85AddCalls++;
  const c = window.__orv85Case;
  if (c === 'http-descriptor') throw new SongShareSaveError('descriptor_fetch', 'http');
  if (c === 'visibility-storage') throw new SongShareSaveError('visibility_write', 'storage');
  throw new Error('unexpected mock case');
}
`;

async function open(
  browser: Browser,
  view: (typeof views)[number],
  item: Case,
  lang: 'ko' | 'en',
) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    locale: lang === 'ko' ? 'ko-KR' : 'en-US',
    hasTouch: view.name !== 'desktop',
    isMobile: view.name !== 'desktop',
  });
  const page = await context.newPage();
  const external: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
      return route.continue();
    external.push(url.href);
    await route.abort();
  });
  await page.route('**/src/song-share.ts*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: mockModule,
    }),
  );
  await page.addInitScript(
    ([name, language]) => {
      (window as any).__orv85Case = name;
      Object.defineProperty(navigator, 'language', { get: () => language });
    },
    [item.name, lang === 'ko' ? 'ko-KR' : 'en-US'],
  );
  await page.goto(`/song/#v=1&video=${MOCK_ID}`);
  await page.evaluate(() => document.fonts.ready);
  const status = page.locator('#song-status');
  await expect(page.locator('#song-add')).toBeEnabled();
  await expect(page.locator('#song-cancel')).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__orv85AddCalls)).toBe(0);
  await page.locator('#song-add').click();
  await expect(status).toContainText(lang === 'ko' ? item.ko : item.en);
  const text = (await status.textContent()) ?? '';
  expect(text).not.toMatch(
    /YouTube|https?:\/\/|Error|stack|Saved to your library|내 곡 목록에 저장했어요/,
  );
  expect(text).not.toContain(MOCK_ID);
  expect(text).toContain(
    lang === 'ko' ? '새 추출은 시작하지 않습니다.' : 'No new extraction was started.',
  );
  expect(
    text.match(lang === 'ko' ? /새 추출은 시작하지 않습니다/g : /No new extraction was started/g)
      ?.length,
  ).toBe(1);
  expect(await page.evaluate(() => (window as any).__orv85AddCalls)).toBe(1);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__orv85AddCalls)).toBe(1);
  await expect(page.locator('#song-add')).toBeEnabled();
  await expect(page.locator('#song-cancel')).toBeEnabled();
  await page.locator('#song-add').click();
  expect(await page.evaluate(() => (window as any).__orv85AddCalls)).toBe(2);
  await expect(page.locator('#song-add')).toBeEnabled();
  await expect(page.locator('#song-cancel')).toBeEnabled();
  if (lang === 'ko') {
    expect(
      await page.evaluate(() => document.fonts.check('16px OrvioKR', '저장')),
    ).toBe(true);
    await expect(status).not.toContainText(
      /저장 단계:|descriptor_fetch|visibility_write/,
    );
    await expect(status).toContainText(/새 추출은 시작하지 않습니다/);
    await expect(status).not.toContainText(
      /새 추출은 시작하지 않습니다.*새 추출은 시작하지 않습니다/,
    );
  }
  expect(external).toEqual([]);
  return { page, context };
}

test('actual song page safe diagnostics, manual retry and pixels', async ({
  browser,
}) => {
  for (const item of cases) {
    for (const view of views) {
      const lang =
        item.name === 'http-descriptor' && view.name === 'mobile' ? 'en' : 'ko';
      const { page, context } = await open(browser, view, item, lang);
      if (view.name === 'short') {
        const heading = page.locator('#song-heading');
        const add = page.locator('#song-add');
        const cancel = page.locator('#song-cancel');
        await heading.scrollIntoViewIfNeeded();
        await expect(heading).toBeVisible();
        await page.screenshot({
          path: '/downloads/current85-short-top-current0313-0139.png',
        });
        await add.scrollIntoViewIfNeeded();
        await expect(add).toBeVisible();
        await cancel.scrollIntoViewIfNeeded();
        await expect(cancel).toBeVisible();
        await page.screenshot({
          path: '/downloads/current85-short-bottom-current0313-0139.png',
        });
        await cancel.focus();
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement?.id)).toBe(
          'song-add',
        );
      }
      await page.screenshot({
        path: `/downloads/current85-${view.name}-current0313-0139.png`,
      });
      await context.close();
    }
  }
});
