import { test, expect } from '@playwright/test';
import { SONGS, makeChart } from '../src/chart';
import { Engine } from '../src/engine';
import { encodeReplay, type ReplayData } from '../src/replay';
import { resultParams } from '../src/share';
async function fixture() {
  const n = makeChart(SONGS[0], 'low', 5),
    e = new Engine(n);
  e.update(9999);
  const options = {
    speed: 1.5,
    fader: 'off' as const,
    shuffle: 'off' as const,
    seed: 0,
  };
  const r: ReplayData = {
    version: 1,
    song: 'first-light',
    lanes: 5,
    difficulty: 'low',
    options,
    ops: [[1, 3500, 9999]],
    end: 3600,
  };
  const encoded = await encodeReplay(r);
  const p = resultParams({
    song: 'first-light',
    lanes: 5,
    difficulty: 'low',
    score: 0,
    accuracy: 0,
    combo: 0,
    judgments: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, e.total],
    options,
  });
  p.set('rp', '1');
  p.set('rn', String(encoded.length));
  p.set('r', encoded);
  return p;
}
test('missing, middle-truncated and fully broken replay never silently downgrade or play', async ({
  page,
}) => {
  for (const mode of ['missing', 'truncated', 'middle', 'corrupt']) {
    const p = await fixture(),
      s = p.get('r')!;
    if (mode === 'missing') p.delete('r');
    else if (mode === 'truncated') p.set('r', s.slice(0, -4));
    else if (mode === 'middle') p.set('r', s.slice(0, 12) + s.slice(20));
    else p.set('r', 'bad%%');
    await page.goto('/result/#' + p);
    await expect(page.locator('#results')).toBeVisible();
    await expect(page.locator('#replay-status')).toBeVisible();
    await expect(page.locator('#watch-replay')).toBeHidden();
    await page.reload();
    await expect(page.locator('#replay-status')).toBeVisible();
  }
});
test('cold and warm replay countdown clocks advance continuously after actual playback starts', async ({
  page,
}) => {
  const p = await fixture();
  await page.goto('/result/#' + p);
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('#watch-replay')).toBeVisible();
    await page.click('#watch-replay');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    const samples = await page.evaluate(
      () =>
        new Promise<any[]>((resolve) => {
          const values: any[] = [];
          const start = performance.now();
          function frame() {
            values.push({
              ms: performance.now() - start,
              audio: (window as any).orvioAudioTime,
              text: document.querySelector('#countdown')?.textContent,
            });
            if (performance.now() - start < 1500) requestAnimationFrame(frame);
            else resolve(values);
          }
          frame();
        }),
    );
    console.log(
      i ? 'warm clock' : 'cold clock',
      JSON.stringify(samples.filter((_, i) => i % 10 === 0)),
    );
    expect(samples.at(-1).audio - samples[0].audio).toBeGreaterThan(1.2);
    let frozen = 0,
      max = 0;
    for (let n = 1; n < samples.length; n++) {
      if (Math.abs(samples[n].audio - samples[n - 1].audio) < 0.001)
        frozen += samples[n].ms - samples[n - 1].ms;
      else frozen = 0;
      max = Math.max(max, frozen);
    }
    expect(max).toBeLessThan(150);
    await expect(page.locator('#results')).toBeVisible({ timeout: 5000 });
  }
});
