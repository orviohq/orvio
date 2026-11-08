import { test, expect } from '@playwright/test';
import { SONGS, makeChart } from '../src/chart';
import { Engine } from '../src/engine';
import { encodeReplay, type ReplayData } from '../src/replay';
test('context menu reuses hide-only confirmation, keyboard/Escape and viewport placement', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('orvio.pending-imports.v1', '[]'),
  );
  await page.goto('/select/');
  // Isolated archived-library fixture uses the real context-menu and confirmation wiring.
  await page.evaluate(async () => {
    const { pinSource } = await import(
      /* @vite-ignore */ String('/src/external-source-store.ts')
    );
    const { chartSetHash } = await import(
      /* @vite-ignore */ String('/src/external-source.ts')
    );
    const notes = [{ id: 0, time: 0.5, lane: 0 }],
      sha = [
        ...new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify(notes)),
          ),
        ),
      ]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    const record: any = {
      version: 1,
      videoId: 'AAAAAAAAAAA',
      audioSha256: 'a'.repeat(64),
      frames: 48000,
      sampleRate: 48000,
      estimatedBpm: 120,
      pipelineVersion: 'fixture',
      analyzerVersion: 'fixture',
      config: '{}',
      charts: Object.fromEntries(
        ['5:low', '5:mid', '5:high', '7:low', '7:mid', '7:high'].map((k) => [
          k,
          { notes, sha256: sha },
        ]),
      ),
    };
    record.chartSetSha256 = await chartSetHash(record);
    await pinSource(record);
  });
  await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
    r.fulfill({
      status: 404,
      contentType: 'application/json',
      body: '{"error":"chart_source_not_found"}',
    }),
  );
  await page.reload();
  const row = page.locator('[data-canonical-video="AAAAAAAAAAA"]');
  await expect(row).toHaveAttribute('data-state', 'error');
  await row.click({ button: 'right' });
  const menu = page.locator('.library-context-menu');
  await expect(menu).toBeVisible();
  await page.screenshot({ path: '/downloads/a25-desktop-menu.png' });
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await row.focus();
  await page.keyboard.press('Shift+F10');
  await menu.getByRole('menuitem').click();
  await expect(page.locator('#remove-song-dialog')).toBeVisible();
  await page.click('#remove-song-cancel');
  await expect(row).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await row.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await row.click({ button: 'right', position: { x: 10, y: 10 } });
  await page.screenshot({ path: '/downloads/a25-mobile-menu.png' });
  const b = await menu.boundingBox();
  expect(b!.x).toBeGreaterThanOrEqual(0);
  expect(b!.x + b!.width).toBeLessThanOrEqual(390);
  await menu.getByRole('menuitem').click();
  await page.click('#remove-song-confirm');
  await expect(row).toHaveCount(0);
  const count = await page.evaluate(async () => {
    const { allPinnedSources } = await import(
      /* @vite-ignore */ String('/src/external-source-store.ts')
    );
    return (await allPinnedSources()).length;
  });
  expect(count).toBe(1);
});
test('all builtin select/list/result thumbnail frames match 16:9 without cropped image rendering', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/select/');
    for (const i of [0, 1, 2]) {
      await page.locator(`[data-song="${i}"]`).click();
      const sizes = await page.evaluate(() =>
        [
          document.querySelector('#selected-art')!,
          ...document.querySelectorAll('.song-card .cover'),
        ].map((el) => {
          const r = el.getBoundingClientRect();
          return r.width / r.height;
        }),
      );
      for (const ratio of sizes)
        expect(Math.abs(ratio - 16 / 9)).toBeLessThan(0.01);
    }
    await page.evaluate(async () => {
      await Promise.all(
        ['first-light', 'afterimage', 'violet-drive'].map(
          (id) =>
            new Promise<void>((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve();
              image.onerror = () => reject(Error(id));
              image.src = '/wallpapers/' + id + '.png';
            }),
        ),
      );
    });
    await page.screenshot({ path: `/downloads/a26-${width}-select.png` });
  }
  const e = new Engine(makeChart(SONGS[0], 'low', 5));
  e.update(9999);
  const replay: ReplayData = {
    version: 1,
    song: 'first-light',
    lanes: 5,
    difficulty: 'low',
    options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 0 },
    ops: [[1, 2000, 9999]],
    end: 2500,
  };
  const j = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
    (v) => e.events.filter((x) => x.value === v).length,
  );
  const p = new URLSearchParams({
    v: '4',
    song: 'first-light',
    keys: '5',
    diff: 'low',
    score: String(e.score),
    acc: (e.sum / e.total).toFixed(2),
    combo: String(e.maxCombo),
    j: j.join(','),
    speed: '1.5',
    shuffle: 'off',
    fade: 'off',
    seed: '0',
    r: await encodeReplay(replay),
  });
  await page.goto('/result/#' + p);
  await expect(page.locator('#results')).toBeVisible();
  const art = await page.locator('#result-art').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { ratio: r.width / r.height, fit: getComputedStyle(el).objectFit };
  });
  expect(Math.abs(art.ratio - 16 / 9)).toBeLessThan(0.01);
  expect(art.fit).toBe('contain');
  await page.screenshot({ path: '/downloads/a26-mobile-result.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: '/downloads/a26-desktop-result.png' });
});
test('loading copy is not painted while assistive state and Escape cancellation remain', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/low/');
  await page.evaluate(() => {
    const resume = AudioContext.prototype.resume;
    let first = true;
    AudioContext.prototype.resume = function () {
      if (first) {
        first = false;
        return new Promise<void>(() => {});
      }
      return resume.call(this);
    };
  });
  await page.keyboard.press('Enter');
  await expect(page.locator('#song-loading')).toBeVisible();
  expect(
    await page
      .locator('#loading-status')
      .evaluate((el) => getComputedStyle(el).clipPath),
  ).toBe('inset(50%)');
  expect(await page.locator('#cancel-startup').innerText()).toContain('ESC');
  await page.screenshot({ path: '/downloads/a27-loading.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#song-loading')).toBeHidden();
  await expect(page.locator('#lobby')).toBeVisible();
});

test('built-in gameplay keeps original wallpaper and readable gear', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() =>
    Boolean((window as any).orvioDiagnostics?.active),
  );
  await page.waitForTimeout(1300);
  await page.screenshot({ path: '/downloads/a26-game-unchanged.png' });
  await page.keyboard.press('Escape');
});
