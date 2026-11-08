import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
const hash = (text: string | Buffer) =>
  createHash('sha256').update(text).digest('hex');
const keys = [
  '5:low',
  '5:mid',
  '5:high',
  '7:low',
  '7:mid',
  '7:high',
  '5:sc',
  '7:sc',
];
const wav = Buffer.alloc(768044);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(48000, 24);
wav.writeUInt32LE(192000, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(wav.length - 44, 40);
const notes = [{ id: 0, time: 1, lane: 0, end: 2 }];
const record: any = {
  version: 1,
  videoId: 'AAAAAAAAAAA',
  audioSha256: hash(wav),
  sampleRate: 48000,
  frames: 192000,
  estimatedBpm: 120,
  pipelineVersion: 'synthetic-test',
  analyzerVersion: 'synthetic-test',
  config: '{}',
  charts: Object.fromEntries(
    keys.map((k) => [k, { notes, sha256: hash(JSON.stringify(notes)) }]),
  ),
  chartMetadata: Object.fromEntries(
    keys.map((k) => [
      k,
      {
        version: 1,
        family: k.endsWith('low')
          ? 'NM'
          : k.endsWith('mid')
            ? 'HD'
            : k.endsWith('high')
              ? 'MX'
              : 'SC',
        rating: { scale: k.endsWith('sc') ? 'sc' : 'standard', level: 1 },
        status: 'rated',
      },
    ]),
  ),
};
record.chartSetSha256 = hash(
  JSON.stringify({
    analyzer: record.analyzerVersion,
    config: record.config,
    charts: keys.map((k) => [k, record.charts[k].sha256]),
    chartMetadata: record.chartMetadata,
  }),
);
const raw = JSON.stringify(record);
const sha = hash(raw);
const identity = {
  v: '1',
  video: record.videoId,
  audio: record.audioSha256,
  chart: record.chartSetSha256,
  record: sha,
};
const fragment = new URLSearchParams(identity).toString();
const title =
  'Night Drive / 꿈 아주 긴 곡 제목으로 모바일 줄바꿈도 확인하는 테스트';
async function mock(page: Page, mode = 'ready') {
  const calls: string[] = [];
  await page.route(
    'https://orvio-share.pn-26f.workers.dev/**',
    async (route) => {
      const req = route.request();
      calls.push(req.method() + ' ' + req.url());
      if (req.method() !== 'GET') throw Error('Unexpected backend write');
      if (req.url().endsWith('/metadata'))
        return route.fulfill({
          json: {
            videoId: record.videoId,
            title,
            author: 'Test Artist',
            durationSec: 4,
            audioSha256: record.audioSha256,
            chartSetSha256: record.chartSetSha256,
            source: 'audio-manifest',
          },
        });
      if (req.url().endsWith('/audio'))
        return route.fulfill({
          body: wav,
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Length': String(wav.length),
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers':
              'X-Content-SHA256,X-Canonical-Audio-SHA256,X-Source-Video-Id,X-Audio-Contract,Content-Length',
            'X-Content-SHA256': record.audioSha256,
            'X-Canonical-Audio-SHA256': record.audioSha256,
            'X-Source-Video-Id': record.videoId,
            'X-Audio-Contract': 'audio/1',
          },
        });
      if (mode === 'missing')
        return route.fulfill({
          status: 404,
          json: { error: 'chart_source_not_found' },
        });
      if (mode === 'pending')
        return route.fulfill({
          status: 202,
          json: { error: 'chart_source_pending', retryAfterSec: 15 },
        });
      return route.fulfill({
        body: raw,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers':
            'X-SourceRecord-SHA256,X-ChartSet-SHA256,X-Canonical-Audio-SHA256',
          'X-SourceRecord-SHA256': sha,
          'X-ChartSet-SHA256': record.chartSetSha256,
          'X-Canonical-Audio-SHA256': record.audioSha256,
        },
      });
    },
  );
  return calls;
}
async function snapshot(page: Page) {
  return page.evaluate(async () => ({
    local: { ...localStorage },
    dbs: (await indexedDB.databases()).map((x) => x.name),
  }));
}
for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
])
  test(`explicit song add, duplicate, private-link payload, pixels ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const calls = await mock(page);
    await page.goto('/song/#' + fragment);
    await expect(page.locator('#song-add')).toBeEnabled();
    await expect(page.locator('#song-title')).toHaveText(title);
    expect(await snapshot(page)).toEqual({ local: {}, dbs: [] });
    expect(calls).toHaveLength(2);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.fonts.check('24px OrvioKR', '꿈')),
    ).toBe(true);
    mkdirSync('/downloads/a40-proof', { recursive: true });
    await page.screenshot({
      path: `/downloads/a40-proof/invitation-${viewport.width}.png`,
      fullPage: true,
    });
    await page.locator('#song-add').click();
    await expect(page.locator('#song-status')).toContainText('저장했어요');
    const count = await page.evaluate(async () => {
      const req = indexedDB.open('orvio.external-sources.v1');
      const db: IDBDatabase = await new Promise(
        (r) => (req.onsuccess = () => r(req.result)),
      );
      return await new Promise((r) => {
        const q = db.transaction('records').objectStore('records').count();
        q.onsuccess = () => {
          db.close();
          r(q.result);
        };
      });
    });
    expect(count).toBe(1);
    await page.reload();
    await expect(page.locator('#song-add')).toBeEnabled();
    await page.locator('#song-add').click();
    await expect(page.locator('#song-status')).toContainText('저장했어요');
    const refs = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('orvio.canonical-library.v1') || '[]'),
    );
    expect(refs).toHaveLength(1);
    expect(refs[0].audioSha256).toBe(record.audioSha256);
    await page.screenshot({
      path: `/downloads/a40-proof/saved-${viewport.width}.png`,
      fullPage: true,
    });
    await page.locator('#song-add').click();
    await expect(page).toHaveURL(/\/select\/\?song=yt-/);
    await expect(page.locator('#selected-title')).toHaveText(title, {
      timeout: 15000,
    });
    await expect(page.locator('#share-song')).toHaveCount(0);
    await page
      .locator('.song-card')
      .filter({ hasNotText: title })
      .first()
      .click();
    await expect(page.locator('#selected-title')).not.toHaveText(title);
    const row = page.locator('.song-card').filter({ hasText: title }).first();
    await row.click({ button: 'right' });
    await expect(
      page.locator('.library-context-menu [data-action=share]'),
    ).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(
      page.locator('.library-context-menu [data-action=remove]'),
    ).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.screenshot({
      path: `/downloads/orv56-menu-${viewport.width}.png`,
    });
    await page.locator('.library-context-menu [data-action=share]').click();
    await expect(page.locator('.song-link-dialog textarea')).toBeVisible();
    const link = await page.locator('.song-link-dialog textarea').inputValue();
    expect(link).toContain('/song/#');
    expect(link).not.toMatch(/replay|jobId|score|title/);
    await page.screenshot({
      path: `/downloads/a40-proof/share-${viewport.width}.png`,
      fullPage: true,
    });
    await page.locator('.song-link-dialog .quiet').click();
    await row.focus();
    await page.keyboard.press('Shift+F10');
    await expect(
      page.locator('.library-context-menu [data-action=share]'),
    ).toBeFocused();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.locator('#remove-song-dialog')).toBeVisible();
    await page.locator('#remove-song-cancel').click();
    await expect(row).toBeVisible();
    expect(calls.every((x) => x.startsWith('GET '))).toBe(true);
  });
for (const state of ['missing', 'pending', 'changed', 'invalid'])
  test(`song link ${state} does not add or extract`, async ({ page }) => {
    const calls = await mock(page, state);
    await page.goto(
      '/song/#' +
        (state === 'invalid'
          ? 'v=5&d=private-replay'
          : state === 'changed'
            ? new URLSearchParams({ ...identity, record: 'd'.repeat(64) })
            : fragment),
    );
    await expect(page.locator('#song-status')).not.toHaveText(
      '곡 정보를 확인하고 있어요…',
    );
    await expect(page.locator('#song-add')).toBeDisabled();
    expect(await snapshot(page)).toEqual({ local: {}, dbs: [] });
    expect(calls.every((x) => x.startsWith('GET '))).toBe(true);
    await page.locator('#song-cancel').click();
    await expect(page).toHaveURL(/\/select\//);
  });

test('retained audio unavailable: no pin, no extraction and retry stays available', async ({
  page,
}) => {
  await mock(page);
  await page.route('**/v1/chart-sources/*/audio', (r) =>
    r.fulfill({ status: 410, json: { error: 'audio_expired' } }),
  );
  await page.goto('/song/#' + fragment);
  await expect(page.locator('#song-add')).toBeEnabled();
  await page.locator('#song-add').click();
  await expect(page.locator('#song-status')).toContainText(
    '저장하지 못했습니다',
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem('orvio.canonical-library.v1'),
    ),
  ).toBeNull();
  await expect(page.locator('#song-add')).toBeEnabled();
  await expect(page.locator('#song-cancel')).toBeEnabled();
});

test('local storage refusal shows retry, not false saved confirmation', async ({
  page,
}) => {
  await mock(page);
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.goto('/song/#' + fragment);
  await expect(page.locator('#song-add')).toBeEnabled();
  await page.locator('#song-add').click();
  await expect(page.locator('#song-status')).toContainText(
    '저장하지 못했습니다',
  );
  await expect(page.locator('#song-add')).toBeEnabled();
  await expect(page.locator('#song-cancel')).toBeEnabled();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('orvio.canonical-library.v1'),
    ),
  ).toBeNull();
});
