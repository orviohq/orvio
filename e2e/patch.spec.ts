import { test, expect } from '@playwright/test';
import { atKey } from './input';
test('equal integer lane widths survive resize and MAX100 has no field overlay', async ({
  page,
}) => {
  for (const lanes of [5, 7]) {
    await page.goto(`/play/first-light/${lanes}/low/`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    for (const width of [1280, 1023, 1441]) {
      await page.setViewportSize({ width, height: 720 });
      await page.waitForTimeout(120);
      const dimensions = await page
        .locator('#highway canvas')
        .evaluate((e) => ({
          width: (e as HTMLCanvasElement).width,
          css: e.getBoundingClientRect().width,
        }));
      expect(dimensions.width % lanes).toBe(0);
      expect(dimensions.css).toBe(dimensions.width);
    }
    await page.keyboard.press('Escape');
    await page.click('#pause-exit');
  }
  // The key is dispatched from a page timer. A main-thread stall at game start
  // delays that dispatch, so the judged delta then equals the harness lateness,
  // not a product timing error. Each attempt is a NEW session judging notes[0]
  // (startup coverage is kept). Dispatch lateness is measured. Only an attempt
  // dispatched within ON_TIME_MS is judged, and it keeps the original
  // assertions verbatim. An attempt that was late is recorded as a harness
  // stall. If no attempt is on time the test FAILS with every record, so there
  // is no pass by exclusion.
  const ON_TIME_MS = 15;
  const records: unknown[] = [];
  let judged = false;
  for (let attempt = 0; attempt < 4 && !judged; attempt++) {
    await page.goto('/play/first-light/5/low/');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
    const note = await page.evaluate(
      () => (window as any).orvioDiagnostics.notes[0]?.note,
    );
    if (!note) throw new Error('no first note in diagnostics');
    await page.evaluate(() => {
      (window as any).targetPerfect = undefined;
      const observer = new MutationObserver(() => {
        const event = (window as any).orvioDiagnostics.events[0];
        if (!event) return;
        (window as any).targetPerfect = {
          event,
          judge: document.querySelector('#judge')!.className,
          impact: document.querySelector('#impact')!.className,
        };
        observer.disconnect();
      });
      observer.observe(document.querySelector('#judge')!, {
        childList: true,
        attributes: true,
        characterData: true,
      });
    });
    const dispatch = await atKey(
      page,
      note.time,
      (await page.locator('#keycaps span').allTextContents())[note.lane].replace('␣', 'Space').toLowerCase(),
      true,
    );
    const onTime = dispatch.latenessMs <= ON_TIME_MS;
    let sample: any = null;
    try {
      await page.waitForFunction(() => (window as any).targetPerfect, null, {
        timeout: 5000,
      });
      sample = await page.evaluate(() => (window as any).targetPerfect);
    } catch {
      // Recorded below; an on-time attempt without an event is a hard failure.
    }
    const record = {
      attempt,
      class: !onTime ? 'harness-stall' : sample ? 'on-time' : 'no-event',
      note: note.id,
      dispatch,
      event: sample?.event ?? null,
    };
    records.push(record);
    console.log('MAX100_DIAGNOSTIC', JSON.stringify(record));
    if (!onTime) continue;
    judged = true;
    expect(
      sample,
      'no judgment event: ' + JSON.stringify(records),
    ).toBeTruthy();
    expect(sample.event.noteId).toBe(note.id);
    expect(sample.event.value).toBe(100);
    expect(Math.abs(sample.event.delta)).toBeLessThanOrEqual(41.67);
    expect(sample.judge).toBe('perfect');
    expect(sample.impact).toBe('');
  }
  expect(
    judged,
    'harness-stall: no on-time first-note dispatch in 4 sessions: ' +
      JSON.stringify(records),
  ).toBe(true);
});
test('broken hold has muted remaining tail without score re-entry', async ({
  page,
}) => {
  await page.goto('/play/first-light/5/low/');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as any).orvioDiagnostics.active);
  const note = await page.evaluate(
    () =>
      (window as any).orvioDiagnostics.notes.find((s: any) => s.note.end).note,
  );
  const key = (await page.locator('#keycaps span').allTextContents())[note.lane].replace('␣', 'Space').toLowerCase();
  await atKey(page, note.time, key, true);
  await atKey(page, note.time + 0.15, key, false);
  const before = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(before.notes.find((s: any) => s.note.id === note.id).tail).toBe(0);
  await page.screenshot({ path: 'test-results/failed-hold-remaining.png' });
  await atKey(page, note.time + 0.25, key, true);
  const after = await page.evaluate(() => (window as any).orvioDiagnostics);
  expect(after.events.filter((e: any) => e.noteId === note.id).length).toBe(2);
  expect(after.notes.find((s: any) => s.note.id === note.id).done).toBe(true);
});
