import { test, expect } from '@playwright/test';
// A37: a /play/ refresh must paint the loading overlay, never the ready
// screen's start button. The first Enter/click gesture runs the normal
// start path (audio activation still requires that gesture); Escape leaves.
const sampler = () => {
  const w = window as any;
  w.__flashLog = [];
  let last = '';
  const sample = () => {
    const q = (s: string) => {
      const el = document.querySelector(s);
      return el ? !el.classList.contains('hidden') : null;
    };
    const state = JSON.stringify({
      ready: q('#ready-screen'),
      loading: q('#song-loading'),
    });
    if (state !== last) {
      last = state;
      w.__flashLog.push({ t: Math.round(performance.now()), state });
    }
    if (performance.now() < 60000) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
};

test('play-route refresh paints loading, never the ready start button', async ({
  page,
}) => {
  await page.addInitScript(sampler);
  await page.goto('/play/afterimage/7/mid/');
  await expect(page.locator('#song-loading')).toBeVisible();
  await expect(page.locator('#ready-screen')).toBeHidden();
  await expect(page.locator('#loading-status')).toHaveText(/플레이 시작/);
  // Hold the gate while the preload renders the song, then the gesture
  // starts warm: no loading dwell, no ready-screen paint at any frame.
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/a37-refresh-loading.png' });
  const gestureAt = await page.evaluate(() => performance.now());
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active, {
    timeout: 30000,
  });
  const startMs = (await page.evaluate(() => performance.now())) - gestureAt;
  console.log('gesture-to-active ms after 3s gate:', Math.round(startMs));
  expect(startMs).toBeLessThan(6000);
  const frames: { t: number; state: string }[] = await page.evaluate(
    () => (window as any).__flashLog,
  );
  const states = frames.map((f) => JSON.parse(f.state));
  expect(states.some((s) => s.ready === true)).toBe(false);
  expect(states.some((s) => s.loading === true)).toBe(true);
});

test('play-route refresh Escape returns to song select', async ({ page }) => {
  await page.goto('/play/afterimage/7/mid/');
  await expect(page.locator('#song-loading')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/select\//);
  await expect(page.locator('#lobby')).toBeVisible();
  await expect(page.locator('#song-loading')).toBeHidden();
});

test('play-route refresh overlay click starts the song', async ({ page }) => {
  await page.goto('/play/afterimage/7/mid/');
  await expect(page.locator('#song-loading')).toBeVisible();
  await page.click('#song-loading');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active, {
    timeout: 30000,
  });
});

test('repeat refresh starts fast even on an immediate gesture', async ({
  page,
}) => {
  // First play renders and persists the track; the next fresh load must
  // hydrate from IndexedDB during the gate, so a fast Enter stays immediate.
  await page.goto('/play/afterimage/7/mid/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active, {
    timeout: 30000,
  });
  await page.keyboard.press('Escape');
  await page.click('#pause-exit');
  await page.goto('/play/afterimage/7/mid/');
  await expect(page.locator('#song-loading')).toBeVisible();
  await page.waitForTimeout(400);
  const gestureAt = await page.evaluate(() => performance.now());
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active, {
    timeout: 30000,
  });
  const startMs = (await page.evaluate(() => performance.now())) - gestureAt;
  console.log(
    'gesture-to-active ms on cached repeat refresh:',
    Math.round(startMs),
  );
  expect(startMs).toBeLessThan(3500);
});
