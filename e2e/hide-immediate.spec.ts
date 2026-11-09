import fs from 'node:fs';
import { test, expect } from '@playwright/test';
for (const ready of [false, true])
  test(`confirmed hide repaints ${ready ? 'saved' : 'unavailable'} row immediately and retains original data`, async ({
    page,
  }, testInfo) => {
    const f = JSON.parse(
      fs.readFileSync('e2e/fixtures/v027-synthetic-fixture.json', 'utf8'),
    );
    await page.route('https://orvio-share.pn-26f.workers.dev/**', (r) =>
      r.fulfill({ status: 404, json: { error: 'chart_source_not_found' } }),
    );
    await page.goto('/select/');
    await page.evaluate(
      async ({ raw, bytes, ready }) => {
        const { pinSource } = await import(
          /* @vite-ignore */ String('/src/external-source-store.ts')
        );
        const { saveLocalAudio } = await import(
          /* @vite-ignore */ String('/src/external-local.ts')
        );
        const { rememberCanonical } = await import(
          /* @vite-ignore */ String('/src/canonical-library.ts')
        );
        const record = JSON.parse(raw);
        await pinSource(record);
        if (ready) await rememberCanonical(record, 'b'.repeat(64));
        if (ready)
          await saveLocalAudio(
            record,
            'Hide retention fixture',
            'fixture-job',
            new Uint8Array(bytes).buffer,
          );
      },
      { raw: f.records[0].raw, bytes: f.bytes, ready },
    );
    await page.reload();
    const row = ready
      ? page
          .locator('#songs [data-song]')
          .filter({ hasText: 'Hide retention fixture' })
      : page.locator('[data-canonical-video="AAAAAAAAAAA"]');
    await expect(row).toBeVisible();
    const snapshot = () =>
      page.evaluate(async () => {
        const { allPinnedSources } = await import(
          /* @vite-ignore */ String('/src/external-source-store.ts')
        );
        const { localAudio } = await import(
          /* @vite-ignore */ String('/src/external-local.ts')
        );
        const records = (await allPinnedSources()).filter(
          (r: { videoId: string }) => r.videoId === 'AAAAAAAAAAA',
        );
        const asset = records.length ? await localAudio(records[0]) : null;
        return {
          records: JSON.stringify(records),
          audio: asset ? Array.from(new Uint8Array(asset.bytes)) : null,
        };
      });
    const before = await snapshot();
    // Keyboard context works for both selectable rows and aria-disabled unavailable rows.
    await row.focus();
    await page.keyboard.press('Shift+F10');
    await page.locator('.library-context-menu [data-action=remove]').click();
    await page.click('#remove-song-cancel');
    await expect(row).toBeVisible();
    await row.focus();
    await page.keyboard.press('Shift+F10');
    await page.locator('.library-context-menu [data-action=remove]').click();
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      (window as any).restoreHiddenWrite = () => {
        Storage.prototype.setItem = original;
      };
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'orvio.library-hidden.v1')
          throw new DOMException('Full', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await page.click('#remove-song-confirm');
    await expect(row).toBeVisible();
    await expect(page.locator('#remove-song-dialog')).toBeVisible();
    expect(
      await page.evaluate(() =>
        localStorage.getItem('orvio.library-hidden.v1'),
      ),
    ).toBeNull();
    expect(await snapshot()).toEqual(before);
    await page.evaluate(() => (window as any).restoreHiddenWrite());
    await page.click('#remove-song-cancel');
    await row.focus();
    await page.keyboard.press('Shift+F10');
    await page.locator('.library-context-menu [data-action=remove]').click();
    await page.click('#remove-song-confirm');
    await expect(row).toHaveCount(0);
    expect(await snapshot()).toEqual(before);
    await page.screenshot({
      path: testInfo.outputPath('hidden-immediately.png'),
    });
    await page.reload();
    await expect(row).toHaveCount(0);
    expect(await snapshot()).toEqual(before);
  });
