import { test, expect } from '@playwright/test';


test('pending import border shine moves on desktop and mobile without a spinner', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Fixture controls only the import runner; real main.ts and CSS render the row.
  // This proves pending-state motion, not live import service success.
  await page.addInitScript(() => localStorage.setItem('orvio.pending-imports.v1', JSON.stringify([{ videoId: 'WGm2HmXeeRI', jobId: 'shine-fixture', title: 'Pending import shine fixture', state: 'loading', stage: 'extracting' }])));
  await page.route('**/src/background-imports.ts', async route => {
    const response = await route.fetch();
    const body = await response.text();
    const needle = '(this.directImport ?? importYoutube)';
    expect(body.split(needle).length - 1).toBe(1);
    const runner = `(async (input, signal, options) => { if (input !== 'WGm2HmXeeRI') return (this.directImport ?? importYoutube)(input, signal, options); options.onStage?.('extracting'); return await new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })); })`;
    await route.fulfill({ response, body: body.replace(needle, runner) });
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/select/');
  const row = page.locator('[data-import-video]');
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('data-import-stage', 'extracting', {
    timeout: 10000,
  });

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(row).toHaveClass(/import-pending/);await page.screenshot({path:`/downloads/orv99-full-${viewport.name}-0158.png`});
    await expect(row.locator('.youtube-spinner')).toHaveCount(0);
    const frames: Buffer[] = [];
    for (let frame = 1; frame <= 3; frame++) {
      if (frame > 1) await page.waitForTimeout(600);
      frames.push(
        await page.screenshot({clip: (await row.boundingBox())!,
          path: `/tmp/orv99-pixel-${viewport.name}-${frame}.png`,
          animations: 'allow',
        }),
      );
    }
    expect(frames[0].equals(frames[1])).toBe(false);
    expect(frames[1].equals(frames[2])).toBe(false);
    expect(frames[0].equals(frames[2])).toBe(false);
    await expect(row.locator('.youtube-spinner')).toHaveCount(0);
  }

  const normalRow = page.locator('.song-card:not(.import-pending)').first();
  await expect(normalRow).toBeVisible();
  await normalRow.screenshot({ path: '/tmp/orv99-pixel-contrast.png' });
});
