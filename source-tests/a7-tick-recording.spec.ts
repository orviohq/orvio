import { AUDIO_BASE } from '../src/external-audio-api';
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
// An exact 8-second PCM excerpt tests original finish/results/local replay quickly.
// Full-length 125s PCM sync was checked separately; this is not that evidence.
const raw = fs.readFileSync('fixtures/audio1.wav');
let offset = 12,
  data = 0;
while (offset < raw.length) {
  const size = raw.readUInt32LE(offset + 4);
  if (raw.toString('ascii', offset, offset + 4) === 'data') {
    data = offset;
    break;
  }
  offset += 8 + size + (size % 2);
}
if (!data) throw Error('Missing PCM');
const bytes = Buffer.from(raw.subarray(0, data + 8 + 48000 * 4 * 8));
bytes.writeUInt32LE(bytes.length - 8, 4);
bytes.writeUInt32LE(48000 * 4 * 8, data + 4);
const sha = createHash('sha256').update(bytes).digest('hex');
for (const [lanes, early] of [[7, false]] as const)
  test(`legacy source explicitly regenerated then tick recording lifecycle (head judgment inherited) SC hold ${lanes}K is playable and replay-exact`, async ({
    page,
  }) => {
    await page.route('**/src/external-source-provider.ts', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: fs.readFileSync(
          'source-tests/fixtures/legacy-provider-browser.js',
          'utf8',
        ),
      }),
    );
    await page.route('https://i.ytimg.com/**', (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: fs.readFileSync('public/wallpapers/first-light.png'),
      }),
    );
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    let posts = 0,
      network = 0;
    await page.route(AUDIO_BASE + '/**', (route) => {
      network++;
      if (route.request().method() === 'POST') posts++;
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers':
          'X-Content-SHA256,X-Source-Video-Id,X-Audio-Contract',
      };
      if (route.request().url().endsWith('/audio'))
        return route.fulfill({
          contentType: 'audio/wav',
          headers: {
            ...headers,
            'X-Content-SHA256': sha,
            'X-Source-Video-Id': 'uXn-zOt68V8',
            'X-Audio-Contract': 'audio/1',
          },
          body: bytes,
        });
      return route.fulfill({
        contentType: 'application/json',
        headers,
        body: JSON.stringify({
          jobId: 'short-excerpt',
          status: 'done',
          title: 'Monkeys Spinning Monkeys',
          author: 'Kevin MacLeod',
          audio: {
            sha256: sha,
            sizeBytes: bytes.length,
            contentType: 'audio/wav',
            durationSec: 8,
            contractVersion: 'audio/1',
            expiresAt: Date.now() + 86400000,
          },
        }),
      });
    });
    await page.goto('/select/');
    await page.click('#add-youtube');
    await page.fill(
      '#youtube-url',
      'https://www.youtube.com/watch?v=uXn-zOt68V8',
    );
    await page.click('#youtube-submit');
    await expect(page.locator('#youtube-import')).not.toBeVisible();
    const old = await page.evaluate(async () => {
      const { listPinnedSources } =
        await import('/src/external-source-store.ts');
      return (await listPinnedSources('uXn-zOt68V8'))[0];
    });
    expect(old.chartSetSha256).toBeUndefined();
    await page.unroute('**/src/external-source-provider.ts');
    await page.reload();
    await page.locator('[data-song="3"]').click();
    await page.click('#regenerate-chart');
    await expect(page.locator('#regenerate-chart')).toBeEnabled();
    await expect(page.locator('.song-card')).toHaveCount(5);
    await expect(page.locator('#local-replay')).toBeHidden();
    const current = await page.evaluate(async () => {
      const { listPinnedSources } =
        await import('/src/external-source-store.ts');
      return (await listPinnedSources('uXn-zOt68V8'))[1];
    });
    expect(current.chartSetSha256).toMatch(/^[a-f0-9]{64}$/);

    await page.click(`[data-lanes="${lanes}"]`);
    await page.click('[data-diff="sc"]');
    const selectedLevel = await page.locator('[data-diff="sc"]').textContent();
    expect(selectedLevel).toMatch(/^SC \d+/);
    await page.click('#start');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    const note = await page.evaluate(
      () =>
        (window as any).orvioDiagnostics.notes.find(
          (s: any) => s.note.time > 1 && s.note.end,
        ).note,
    );
    const key = (
      lanes === 5
        ? ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK']
        : ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL']
    )[note.lane];
    const observed = await page.evaluate(
      async ({ note, key, early }) => {
        const at = (target: number, act: () => void) =>
          new Promise<number>((resolve) => {
            const tick = () => {
              if ((window as any).orvioAudioTime < target) {
                setTimeout(tick, 1);
                return;
              }
              const time = (window as any).orvioAudioTime;
              act();
              resolve(time);
            };
            tick();
          });
        const head = await at(note.time, () =>
          window.dispatchEvent(
            new KeyboardEvent('keydown', { code: key, bubbles: true }),
          ),
        );
        const pause = await at(note.time + 0.07, () =>
          window.dispatchEvent(
            new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }),
          ),
        );
        return { head, pause };
      },
      { note, key, early },
    );
    await page.waitForFunction(() => (window as any).orvioDiagnostics.paused);
    const frozen = await page.evaluate(() => (window as any).orvioAudioTime);
    console.log(
      'hold-dispatch-head-pause',
      JSON.stringify({ lanes, early, note, observed, frozen }),
    );
    if (early) expect(frozen).toBeLessThan(note.end - 0.14);
    await page.screenshot({
      path: `test-results/regenerated-hold-${lanes}-paused.png`,
    });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => (window as any).orvioAudioTime)).toBe(
      frozen,
    );
    // Schedule before resuming so no automation round trip can skip the tail.
    const release = page.evaluate(
      ({ note, key, early }) =>
        new Promise<number>((resolve) => {
          const target = early ? note.time + 0.12 : note.end;
          const tick = () => {
            if (
              (window as any).orvioDiagnostics.paused ||
              (window as any).orvioAudioTime < target
            ) {
              setTimeout(tick, 1);
              return;
            }
            const time = (window as any).orvioAudioTime;
            window.dispatchEvent(
              new KeyboardEvent('keyup', { code: key, bubbles: true }),
            );
            resolve(time);
          };
          tick();
        }),
      { note, key, early },
    );
    await page.click('#resume');
    console.log(
      'hold-dispatch-release',
      JSON.stringify({ lanes, early, time: await release, note }),
    );
    const tail = await page.evaluate(
      (id) =>
        (window as any).orvioDiagnostics.events.find(
          (e: any) => e.noteId === id && e.tail,
        ),
      note.id,
    );
    const headEvent = await page.evaluate(
      (id) =>
        (window as any).orvioDiagnostics.events.find(
          (e: any) => e.noteId === id && !e.tail,
        ),
      note.id,
    );
    expect(headEvent.value).toBeGreaterThan(0);
    expect(tail.value).toBe(headEvent.value);
    await expect(page.locator('#results')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.result-option-difficulty')).toContainText(
      selectedLevel!,
    );
    await page.screenshot({ path: `test-results/a4-sc-${lanes}-result.png` });
    await expect(page.locator('#result-art')).toHaveAttribute(
      'src',
      /i.ytimg.com/,
    );
    expect(
      await page
        .locator('#result-art')
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
    await expect(page.locator('#watch-replay')).toBeVisible();
    await expect(page.locator('#share-result')).toBeHidden();
    const original = await page.evaluate(
      () => (window as any).orvioDiagnostics,
    );
    expect(original.events.some((e: any) => e.value > 0)).toBe(true);
    const score = await page.locator('#result-score').textContent();
    await page.screenshot({
      path: `test-results/regenerated-hold-${lanes}-result.png`,
    });
    const count = network;
    await page.reload();
    await expect(page.locator('#results')).toBeVisible();
    await expect(page.locator('#result-score')).toHaveText(score!);
    await page.click('#watch-replay');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    await expect(page.locator('#results')).toBeVisible({ timeout: 15000 });
    const replay = await page.evaluate(() => (window as any).orvioDiagnostics);
    expect(replay.events).toEqual(original.events);
    await expect(page.locator('#result-score')).toHaveText(score!);
    expect(network).toBe(count);
    expect(posts).toBe(1);
    expect(errors).toEqual([]);
    const stored = await page.evaluate(async () => {
      const { listPinnedSources } =
        await import('/src/external-source-store.ts');
      const { localMetadata, readLocalSession } =
        await import('/src/external-local.ts');
      const records = await listPinnedSources('uXn-zOt68V8');
      return {
        records,
        oldmeta: await localMetadata(records[0]),
        newmeta: await localMetadata(records[1]),
        replay: (
          await readLocalSession(
            (await localMetadata(records[1])).latestSession,
          )
        ).replay,
      };
    });
    expect(stored.records[0]).toEqual(old);
    expect(stored.records[1]).toEqual(current);
    expect(stored.oldmeta.latestSession).toBeUndefined();
    expect(stored.newmeta.latestSession).toBeTruthy();
    const ticks = original.fever.journal.filter(
      (e: any) => e.kind === 'hold-tick',
    );
    expect(ticks.length).toBeGreaterThan(0);
    const coverage = ticks.map((tick: any) => ({
      tick,
      nextOp: stored.replay.ops.find(
        (op: any) => [0, 1].includes(op[0]) && op[2] >= tick.time,
      ),
      nextFrame: stored.replay.ops.find(
        (op: any) => op[0] === 1 && op[2] >= tick.time,
      ),
    }));
    fs.writeFileSync(
      `test-results/a7-tick-coverage-${lanes}.json`,
      JSON.stringify({ coverage, replay: stored.replay, original }, null, 2),
    );
    console.log('tick-coverage', JSON.stringify(coverage));
    await page.click('#back');
    await expect(page.locator('#local-replay')).toBeVisible();
    await page.click('#local-replay');
    await expect(page.locator('#results')).toBeVisible();
  });
