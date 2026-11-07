import { test, expect } from '@playwright/test';
import { SONGS, makeChart } from '../src/chart';
import { Engine } from '../src/engine';
import { encodeReplay, type ReplayData } from '../src/replay';
test('exact recorded MAX100 input reaches the real HUD with perfect class and gold color', async ({
  page,
}) => {
  const notes = makeChart(SONGS[0], 'low', 5),
    n = notes[0];
  const ops: ReplayData['ops'] = [
    [0, 400, n.time, n.lane, 1],
    [0, 800, n.end ?? n.time + 0.03, n.lane, 0],
    [1, 2000, 9999],
  ];
  const r: ReplayData = {
    version: 1,
    song: 'first-light',
    lanes: 5,
    difficulty: 'low',
    options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 0 },
    ops,
    end: 2500,
  };
  const e = new Engine(notes);
  e.input({ lane: n.lane, time: n.time, down: true, sequence: 0 });
  e.input({
    lane: n.lane,
    time: n.end ?? n.time + 0.03,
    down: false,
    sequence: 1,
  });
  e.update(9999);
  expect(e.events[0].value).toBe(100);
  expect(e.events[0].delta).toBe(0);
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
    r: await encodeReplay(r),
  });
  await page.goto('/result/#' + p);
  await expect(page.locator('#watch-replay')).toBeVisible();
  await page.click('#watch-replay');
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#judge')).toHaveClass('perfect');
  await expect(page.locator('#judge')).toHaveText('MAX 100%');
  expect(
    await page.locator('#judge').evaluate((e) => getComputedStyle(e).color),
  ).toBe('rgb(255, 244, 168)');
  await page.screenshot({ path: 'test-results/deterministic-perfect-hit.png' });
});

test('exact hold head and tail remain MAX100 and held body renders beyond head culling', async ({
  page,
}) => {
  const notes = makeChart(SONGS[0], 'low', 5),
    n = notes.find((n) => n.end)!;
  const ops: ReplayData['ops'] = notes
    .filter((x) => x.time <= n.end!)
    .flatMap(
      (x) =>
        [
          [0, x.time * 1000 + 160, x.time, x.lane, 1],
          [
            0,
            (x.end ?? x.time + 0.03) * 1000 + 160,
            x.end ?? x.time + 0.03,
            x.lane,
            0,
          ],
        ] as ReplayData['ops'],
    )
    .sort((a, b) => a[1] - b[1]);
  const end = Math.max(...ops.map((x) => x[1])) + 1500;
  ops.push([1, end, 9999]);
  const e = new Engine(notes);
  ops.forEach((x, i) => {
    if (x[0] === 0)
      e.input({ lane: x[3], time: x[2], down: !!x[4], sequence: i });
    else e.update(x[2]);
  });
  const r: ReplayData = {
    version: 1,
    song: 'first-light',
    lanes: 5,
    difficulty: 'low',
    options: { speed: 1.5, fader: 'off', shuffle: 'off', seed: 0 },
    ops,
    end,
  };
  const { resultParams } = await import('../src/share');
  const p = resultParams({
    song: r.song,
    lanes: 5,
    difficulty: 'low',
    score: e.score,
    accuracy: e.sum / e.total,
    combo: e.maxCombo,
    judgments: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
      (v) => e.events.filter((x) => x.value === v).length,
    ),
    options: r.options,
  });
  p.set('r', await encodeReplay(r));
  await page.goto('/result/#' + p);
  await expect(page.locator('#watch-replay')).toBeVisible();
  await page.click('#watch-replay');
  await page.waitForFunction((id) => {
    const d = (window as any).orvioDiagnostics;
    return (
      d.notes?.find((s: any) => s.note.id === id)?.held &&
      d.clock > d.notes.find((s: any) => s.note.id === id).note.time + 0.3
    );
  }, n.id);
  await page.screenshot({ path: 'test-results/exact-hold-visible.png' });
  await page.waitForFunction(
    (id) =>
      (window as any).orvioDiagnostics.events.some(
        (x: any) => x.noteId === id && x.tail,
      ),
    n.id,
  );
  const events = await page.evaluate(
    (id) =>
      (window as any).orvioDiagnostics.events.filter(
        (x: any) => x.noteId === id,
      ),
    n.id,
  );
  expect(events.map((x: any) => x.value)).toEqual([100, 100]);
  expect(events.map((x: any) => x.delta)).toEqual([0, 0]);
});
